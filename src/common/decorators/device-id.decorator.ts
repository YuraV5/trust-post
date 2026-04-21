import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Request } from 'express';

export const DeviceId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  
  const headerRaw = req.headers['x-device-id'];
  const headerValue = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;

  const queryRaw = req.query?.deviceId;
  // Cast or check type to satisfy the compiler
  const queryValue = Array.isArray(queryRaw) ? queryRaw[0] : (queryRaw as string);

  const value = headerValue ?? queryValue;

  // We use isUUID here, which acts as a type guard for the final return
  if (typeof value !== 'string' || !isUUID(value)) {
    throw new BadRequestException('deviceId must be a valid UUID in x-device-id header or query param');
  }

  return value;
});
