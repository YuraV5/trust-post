import { Controller, HttpCode, HttpStatus, Post, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentProvider } from '@prisma/client';
import { PublicRoute } from '../../../common/decorators';
import { WayForPayWebhookBody } from '../decorators';
import { WayForPayWebhookDto } from '../dtos';
import { PaymentsService } from '../services';
import type { WayForPayWebhookAcknowledge } from '../types';

@ApiTags('payments')
@SkipThrottle({ paymentsWebhook: true })
@Controller('payments')
export class PublicPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook/wayforpay')
  @HttpCode(HttpStatus.OK)
  @PublicRoute()
  @SkipThrottle({ paymentsWebhook: false })
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'WayForPay payment webhook (internal)' })
  @ApiBody({ type: WayForPayWebhookDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook acknowledged',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Webhook rate limit exceeded',
  })
  async handleWayForPayWebhook(
    @WayForPayWebhookBody(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    payload: WayForPayWebhookDto,
  ): Promise<WayForPayWebhookAcknowledge> {
    return await this.paymentsService.handleWebhook({
      provider: PaymentProvider.WAYFORPAY,
      payload,
    });
  }
}
