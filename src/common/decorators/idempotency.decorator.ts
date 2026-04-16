import { SetMetadata } from '@nestjs/common';

export const REQUIRE_IDEMPOTENCY_KEY = 'requireIdempotencyKey';
export const RequireIdempotencyKey = (): ReturnType<typeof SetMetadata> => SetMetadata(REQUIRE_IDEMPOTENCY_KEY, true);
