import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CreateUserPaymentDto, PaymentsQueryDto, RegeneratePaymentLinkDto } from '../dtos';
import { PaymentsService } from '../services';
import { PaymentInitResponse, PaymentsPage } from '../types';

@Controller('payments')
export class UserPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async createUserPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserPaymentDto,
  ): Promise<PaymentInitResponse> {
    return await this.paymentsService.createPayment({
      postId: dto.postId,
      amount: dto.amount,
      currency: dto.currency,
      userId: user.userId,
      provider: dto.provider,
    });
  }

  @Post(':paymentId/regenerate-link')
  async regeneratePaymentLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: RegeneratePaymentLinkDto,
  ): Promise<PaymentInitResponse> {
    return await this.paymentsService.regeneratePaymentLink({
      userId: user.userId,
      paymentId,
      provider: dto.provider,
    });
  }

  @Get('my')
  async getMyPayments(@CurrentUser() user: AuthenticatedUser, @Query() query: PaymentsQueryDto): Promise<PaymentsPage> {
    return await this.paymentsService.listMyPayments({
      userId: user.userId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      postId: query.postId,
    });
  }
}
