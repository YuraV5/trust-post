import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';

export const DeviceId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const raw = req.headers['x-device-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !isUUID(value)) {
    throw new BadRequestException('x-device-id header must be a valid UUID');
  }
  return value;
});
