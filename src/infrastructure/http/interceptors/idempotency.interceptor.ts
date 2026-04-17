import { AppBadRequestException, AppConflictException } from '../../../shared/errors/app-errors';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, catchError, from, of, switchMap, throwError } from 'rxjs';
import { createHash } from 'node:crypto';
import { RedisService } from '../../../modules/cache/services';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { REQUIRE_IDEMPOTENCY_KEY } from '../../../common/decorators';

const IDEMPOTENCY_HEADER = 'idempotency-key';
/** TTL for payment-related routes (24 hours) */
const PAYMENT_TTL_SECONDS = 86_400;
/** TTL for all other routes (1 hour) */
const DEFAULT_TTL_SECONDS = 3_600;

type CachedResponse = {
  requestHash: string;
  statusCode: number;
  body: unknown;
  createdAt: string;
};
/**
 * Provides idempotency for mutating HTTP requests (POST, PUT, PATCH, DELETE).
 *
 * - Payment routes: `Idempotency-Key` header is REQUIRED (enforced via @RequireIdempotencyKey()).
 * - Other routes: header is optional; when absent a SHA-256 hash of the normalised body is used.
 * - TTL: 24 h for payment routes, 1 h for all others.
 * - Same key + different payload → 409 Conflict (logged as warn).
 * - Duplicate concurrent requests are serialised via a Redis lock.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly lockTtlSeconds: number;
  private readonly waitTimeoutMs: number;
  private readonly waitPollMs: number;

  constructor(
    private readonly redisService: RedisService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.lockTtlSeconds = 30;
    this.waitTimeoutMs = 8_000;
    this.waitPollMs = 150;
  }
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isEnabled = this.config.get<boolean>('idempotency.enabled') ?? false;
    if (!isEnabled) {
      this.logger.debug('Idempotency interceptor disabled by config');
      return next.handle();
    }

    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request & { user?: { userId?: string } }>();
    const res = httpCtx.getResponse<Response>();

    if (!this.isMutatingMethod(req.method)) {
      return next.handle();
    }

    // Check if the route requires an explicit Idempotency-Key header
    const keyRequired = this.reflector.getAllAndOverride<boolean>(REQUIRE_IDEMPOTENCY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const rawKey = req.headers[IDEMPOTENCY_HEADER]?.toString().trim();

    if (keyRequired && !rawKey) {
      throw new AppBadRequestException('Idempotency-Key header is required for this endpoint.');
    }

    // For optional routes, apply idempotency only when client explicitly provides Idempotency-Key.
    // This avoids accidental replay for normal chat/message create requests with identical payloads.
    if (!keyRequired && !rawKey) {
      this.logger.debug('Idempotency skipped: optional route without Idempotency-Key', {
        method: req.method,
        path: req.originalUrl ?? req.url,
      });
      return next.handle();
    }

    // Scope: user + method + route path — ensures UNIQUE(key, route)
    const scopeUser = req.user?.userId ?? 'anonymous';
    const routePath = req.route?.path ?? req.path;
    const scope = `${scopeUser}:${req.method}:${routePath}`;

    // Stable SHA-256 hash of the normalised request payload
    const requestHash = this.hash(
      this.stableStringify({
        body: req.body ?? null,
        params: req.params ?? {},
        query: req.query ?? {},
      }),
    );

    const idempotencyKey = rawKey as string;

    const operationKey = this.hash(`${scope}:${idempotencyKey}`);
    const responseKey = `idem:resp:${operationKey}`;
    const lockKey = `idem:lock:${operationKey}`;

    // Route-based TTL: payment routes → 24 h, everything else → 1 h
    const ttlSeconds = this.isPaymentRoute(routePath) ? PAYMENT_TTL_SECONDS : DEFAULT_TTL_SECONDS;

    this.logger.debug('Idempotency processing started', {
      method: req.method,
      path: req.originalUrl ?? req.url,
      userId: scopeUser,
      routePath,
      operationKey,
      ttlSeconds,
    });

    res.setHeader('x-idempotency-status', 'processing');

    // Try fetching cached response from Redis
    return from(this.redisService.get(responseKey)).pipe(
      switchMap((cached) => {
        const parsed = this.parseCached(cached);
        if (parsed) {
          this.ensureSamePayload(parsed.requestHash, requestHash, operationKey, routePath);
          res.setHeader('x-idempotency-status', 'replayed');
          res.status(parsed.statusCode);
          this.logger.debug('Idempotency cache hit: replaying cached response', {
            statusCode: parsed.statusCode,
            operationKey,
          });
          return of(parsed.body);
        }

        // Acquire lock to process request
        return from(this.redisService.setIfNotExists(lockKey, '1', this.lockTtlSeconds)).pipe(
          switchMap((lockAcquired) => {
            if (!lockAcquired) {
              this.logger.debug('Idempotency lock busy: waiting for first request result', { operationKey });
              return from(this.waitForResponse(responseKey)).pipe(
                switchMap((waited) => {
                  const waitedParsed = this.parseCached(waited);
                  if (!waitedParsed) {
                    this.logger.debug('Idempotency wait timed out: no cached response', { operationKey });
                    throw new AppConflictException(
                      'Another request with the same idempotency key is in progress. Retry shortly.',
                    );
                  }
                  this.ensureSamePayload(waitedParsed.requestHash, requestHash, operationKey, routePath);
                  res.setHeader('x-idempotency-status', 'replayed');
                  res.status(waitedParsed.statusCode);
                  this.logger.debug('Idempotency wait completed: replaying response from first request', {
                    statusCode: waitedParsed.statusCode,
                    operationKey,
                  });
                  return of(waitedParsed.body);
                }),
              );
            }

            // Lock acquired: process request
            res.setHeader('x-idempotency-status', 'created');
            this.logger.debug('Idempotency lock acquired: processing request', { operationKey });

            return next.handle().pipe(
              switchMap((body) => {
                const payload: CachedResponse = {
                  requestHash,
                  statusCode: res.statusCode,
                  body,
                  createdAt: new Date().toISOString(),
                };

                return from(this.redisService.set(responseKey, JSON.stringify(payload), ttlSeconds)).pipe(
                  switchMap(() => from(this.redisService.del(lockKey))),
                  switchMap(() => {
                    this.logger.debug('Idempotency request processed and cached', {
                      statusCode: res.statusCode,
                      operationKey,
                    });
                    return of(body);
                  }),
                );
              }),
              catchError((error) =>
                from(this.redisService.del(lockKey)).pipe(
                  switchMap(() => {
                    this.logger.debug('Idempotency request failed: lock released', {
                      operationKey,
                      error: error instanceof Error ? error.message : String(error),
                    });
                    return throwError(() => error);
                  }),
                ),
              ),
            );
          }),
        );
      }),
      catchError((error) => {
        this.logger.debug('Idempotency interceptor bypassed after error', { error });
        throw error;
      }),
    );
  }

  private isMutatingMethod(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  private isPaymentRoute(routePath: string): boolean {
    return routePath.toLowerCase().includes('payment');
  }

  /**
   * Throws 409 Conflict when the stored hash does not match the current payload.
   * Prevents re-using an idempotency key with a different body.
   */
  private ensureSamePayload(storedHash: string, currentHash: string, operationKey: string, routePath: string): void {
    if (storedHash !== currentHash) {
      this.logger.warn('Idempotency conflict: key reused with different payload', {
        operationKey,
        routePath,
      });
      throw new AppConflictException('Idempotency-Key has already been used with a different request payload.');
    }
  }

  private parseCached(value: string | null): CachedResponse | null {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as CachedResponse;
      if (!parsed?.requestHash || !parsed?.statusCode) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private async waitForResponse(responseKey: string): Promise<string | null> {
    const started = Date.now();

    while (Date.now() - started < this.waitTimeoutMs) {
      const cached = await this.redisService.get(responseKey);
      if (cached) {
        return cached;
      }
      await this.sleep(this.waitPollMs);
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * Produces a deterministic JSON string regardless of key order,
   * ensuring consistent hashes for identical payloads.
   */
  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableStringify(entry)).join(',')}]`;
    }

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const serialized = keys.map((key) => `${JSON.stringify(key)}:${this.stableStringify(obj[key])}`).join(',');

    return `{${serialized}}`;
  }
}
