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
    return await this.paymentsService.createUserPayment(user, dto);
  }

  @Post(':paymentId/regenerate-link')
  async regeneratePaymentLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
    @Body() dto: RegeneratePaymentLinkDto,
  ): Promise<PaymentInitResponse> {
    return await this.paymentsService.regeneratePaymentLink(user.userId, paymentId, dto);
  }

  @Get('my')
  async getMyPayments(@CurrentUser() user: AuthenticatedUser, @Query() query: PaymentsQueryDto): Promise<PaymentsPage> {
    return await this.paymentsService.listMyPayments(user.userId, query);
  }
}
