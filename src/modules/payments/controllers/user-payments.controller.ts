import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CreateUserPaymentDto, PaymentsQueryDto } from '../dtos';
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

  @Get('my')
  async getMyPayments(@CurrentUser() user: AuthenticatedUser, @Query() query: PaymentsQueryDto): Promise<PaymentsPage> {
    return await this.paymentsService.listMyPayments(user.userId, query);
  }
}
