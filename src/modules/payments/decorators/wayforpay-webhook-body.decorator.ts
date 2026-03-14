import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type RequestWithRawBody = Request & { rawBody?: Buffer };

type RequestWrapper = {
  request: string;
};

type WayForPayPayloadShape = {
  merchantAccount: string;
  orderReference: string;
  merchantSignature: string;
  currency: string;
  transactionStatus: string;
  amount: number;
};

export const WayForPayWebhookBody = createParamDecorator((_data: unknown, ctx: ExecutionContext): unknown => {
  const request = ctx.switchToHttp().getRequest<RequestWithRawBody>();

  const payload = extractWebhookPayload(request.body, request.rawBody);

  return payload;
});

function extractWebhookPayload(body: unknown, rawBody?: Buffer): unknown {
  if (isWebhookPayload(body)) {
    return body;
  }

  if (isRequestWrapper(body)) {
    const parsed = parseJson(body.request);
    if (isWebhookPayload(parsed)) {
      return parsed;
    }
  }

  if (typeof rawBody !== 'undefined' && rawBody.length > 0) {
    const parsed = parseJson(rawBody.toString('utf8'));
    if (isWebhookPayload(parsed)) {
      return parsed;
    }
  }

  throw new BadRequestException('Invalid WayForPay webhook payload');
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRequestWrapper(value: unknown): value is RequestWrapper {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return typeof (value as { request?: unknown }).request === 'string';
}

function isWebhookPayload(value: unknown): value is WayForPayPayloadShape {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as Partial<WayForPayPayloadShape>;

  return (
    typeof payload.merchantAccount === 'string' &&
    typeof payload.orderReference === 'string' &&
    typeof payload.merchantSignature === 'string' &&
    typeof payload.currency === 'string' &&
    typeof payload.transactionStatus === 'string' &&
    typeof payload.amount === 'number'
  );
}
