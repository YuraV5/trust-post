import { Body, Controller, HttpCode, HttpStatus, Post, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentProvider } from '@prisma/client';
import { PublicRoute } from '../../../common/decorators';
import { WayForPayWebhookBody } from '../decorators';
import { CreateAnonymousPaymentDto, WayForPayWebhookDto } from '../dtos';
import { PaymentsService } from '../services';
import type { PaymentInitResponse, WayForPayWebhookAcknowledge } from '../types';
import { BadRequestErrorResponse, NotFoundErrorResponse } from '../../../common/swagger/responses';
import { PaymentInitResponseDto } from '../dtos/doc.swagger';

@ApiTags('payments')
@SkipThrottle({ paymentsAnonymous: true, paymentsWebhook: true })
@Controller('payments')
export class PublicPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('anonymous')
  @PublicRoute()
  @SkipThrottle({ paymentsAnonymous: false })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create anonymous payment request' })
  @ApiBody({ type: CreateAnonymousPaymentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment created successfully, payment link returned',
    type: PaymentInitResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
    type: NotFoundErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Anonymous payment rate limit exceeded',
  })
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
