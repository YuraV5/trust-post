import { AppBadRequestException, AppConflictException } from '../../../shared/errors/app-errors';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, from, of, switchMap, throwError } from 'rxjs';
import { createHash } from 'node:crypto';
import { RedisService } from '../../../modules/cache/services';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { APP_MODE } from '../../../common/consts';

type CachedResponse = {
  requestHash: string;
  statusCode: number;
  body: unknown;
  createdAt: string;
};
/**
 *This interceptor provides idempotency for mutating
 *HTTP requests (POST, PUT, PATCH, DELETE)
 *based on a unique x-idempotency-key header.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly idempotencyTtlSeconds: number;
  private readonly lockTtlSeconds: number;
  private readonly waitTimeoutMs: number;
  private readonly waitPollMs: number;

  constructor(
    private readonly redisService: RedisService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly config: ConfigService,
  ) {
    const baseTtl = this.config.get<number>('idempotencyInterceptorTtl') || 300; // Base TTL of 5 minutes for idempotency keys
    this.idempotencyTtlSeconds = Math.max(30, Math.min(baseTtl, 3600));
    this.lockTtlSeconds = Math.max(5, Math.min(Math.floor(this.idempotencyTtlSeconds / 4), 60));
    this.waitTimeoutMs = 8000;
    this.waitPollMs = 150;
  }
  /**
   * The main intercept method that handles the
   * idempotency logic for incoming HTTP requests.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Dev/test – bypass interceptor
    if (this.config.get('nodeEnv') !== APP_MODE.PRODUCTION) {
      this.logger.debug('Idempotency interceptor disabled in dev/test mode');
      return next.handle();
    }

    // Skip non-HTTP contexts (e.g., RPC, WebSocket)
    if (context.getType() !== 'http') {
      this.logger.debug('Idempotency skipped: non-HTTP context');
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request & { user?: { userId?: string } }>();
    const res = httpCtx.getResponse<Response>();

    // Only apply to mutating methods (POST, PUT, PATCH, DELETE)
    if (!this.isMutatingMethod(req.method)) {
      this.logger.debug('Idempotency skipped: non-mutating method', {
        method: req.method,
        path: req.originalUrl ?? req.url,
      });
      return next.handle();
    }

    // Define request scope for user+method+route
    const scopeUser = req.user?.userId ?? 'anonymous';
    const routePath = req.route?.path ?? req.path;
    const scope = `${scopeUser}:${req.method}:${routePath}`;

    // Stable hash of the request payload
    const requestHash = this.hash(
      this.stableStringify({
        body: req.body ?? null,
        params: req.params ?? {},
        query: req.query ?? {},
      }),
    );

    // Use x-idempotency-key if provided; otherwise generate server key
    const idempotencyKey = req.headers['x-idempotency-key']?.toString().trim() ?? this.hash(`${scope}:${requestHash}`);

    // Keys for Redis cache and lock
    const operationKey = this.hash(`${scope}:${idempotencyKey}`);
    const responseKey = `idem:resp:${operationKey}`;
    const lockKey = `idem:lock:${operationKey}`;

    this.logger.debug('Idempotency processing started', {
      method: req.method,
      path: req.originalUrl ?? req.url,
      userId: scopeUser,
      routePath,
      operationKey,
    });

    res.setHeader('x-idempotency-status', 'processing');

    // Try fetching cached response from Redis
    return from(this.redisService.get(responseKey)).pipe(
      switchMap((cached) => {
        const parsed = this.parseCached(cached);
        if (parsed) {
          this.ensureSamePayload(parsed.requestHash, requestHash);
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
                  this.ensureSamePayload(waitedParsed.requestHash, requestHash);
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

                return from(
                  this.redisService.set(responseKey, JSON.stringify(payload), this.idempotencyTtlSeconds),
                ).pipe(
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

  /** Check if the HTTP method is mutating (POST, PUT, PATCH, DELETE). */
  private isMutatingMethod(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  /** Ensure that the stored payload hash matches the current request payload hash. */
  private ensureSamePayload(storedHash: string, currentHash: string): void {
    if (storedHash !== currentHash) {
      throw new AppBadRequestException('The same x-idempotency-key cannot be reused with a different payload.');
    }
  }

  /** Parse the cached response from Redis and validate its structure. */
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

  /** Wait for a cached response to become available for the given key,
   * polling Redis until it appears or a timeout is reached.
   */
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

  /** Utility method to pause execution for a given number of milliseconds. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Generate a SHA-256 hash for the given string value. */
  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** Stable stringify method that produces consistent string output for the same input,
   * regardless of key order in objects.
   * This is important for generating consistent hashes for request payloads.
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
