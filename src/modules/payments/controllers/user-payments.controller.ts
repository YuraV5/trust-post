import { Body, Controller, Get, Param, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CreateUserPaymentDto, PaymentsQueryDto, RegeneratePaymentLinkDto } from '../dtos';
import { PaymentsService } from '../services';
import { PaymentInitResponse, PaymentsPage } from '../types';
import {
  BadRequestErrorResponse,
  UnauthorizedErrorResponse,
  NotFoundErrorResponse,
} from '../../../common/swagger/responses';
import { PaymentInitResponseDto, PaginatedPaymentsResponseDto } from '../dtos/doc.swagger';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class UserPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create payment request' })
  @ApiBody({ type: CreateUserPaymentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment created successfully, payment link returned',
    type: PaymentInitResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data or insufficient balance',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
    type: NotFoundErrorResponse,
  })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate payment link' })
  @ApiParam({ name: 'paymentId', type: String, description: 'Payment ID' })
  @ApiBody({ type: RegeneratePaymentLinkDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New payment link generated',
    type: PaymentInitResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
    type: NotFoundErrorResponse,
  })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user payments (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'postId', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User payments retrieved with pagination',
    type: PaginatedPaymentsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
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
