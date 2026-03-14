import { Body, Controller, HttpCode, Post, ValidationPipe } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PublicRoute } from '../../../common/decorators';
import { WayForPayWebhookBody } from '../decorators';
import { CreateAnonymousPaymentDto, WayForPayWebhookDto } from '../dtos';
import { PaymentsService } from '../services';
import type { PaymentInitResponse, WayForPayWebhookAcknowledge } from '../types';

@Controller('payments')
export class PublicPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('anonymous')
  @PublicRoute()
  async createAnonymousPayment(@Body() dto: CreateAnonymousPaymentDto): Promise<PaymentInitResponse> {
    return await this.paymentsService.createPayment({
      postId: dto.postId,
      amount: dto.amount,
      currency: dto.currency,
      userId: null,
      provider: dto.provider,
    });
  }

  @Post('webhook/wayforpay')
  @HttpCode(200)
  @PublicRoute()
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
