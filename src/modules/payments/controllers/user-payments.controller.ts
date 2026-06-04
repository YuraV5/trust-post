import { Body, Controller, Get, Param, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CurrentUser, RequireIdempotencyKey } from '../../../common/decorators';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CreateUserPaymentDto, PaymentsQueryDto, RegeneratePaymentLinkDto } from '../dtos';
import { PaymentsService } from '../services';
import { PaymentAttemptsHistoryResponse, PaymentInitResponse, PaymentPostHistoryResponse, PaymentsPage } from '../types';
import {
  BadRequestErrorResponse,
  UnauthorizedErrorResponse,
  NotFoundErrorResponse,
} from '../../../common/swagger/responses';
import {
  PaymentAttemptsHistoryResponseDto,
  PaymentInitResponseDto,
  PaginatedPaymentsResponseDto,
  PaymentPostDonationHistoryResponseDto,
} from '../dtos/doc.swagger';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class UserPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequireIdempotencyKey()
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
      isAnonymous: dto.isAnonymous,
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

  @Get('my/:paymentId/attempts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment attempts history for current user' })
  @ApiParam({ name: 'paymentId', type: String, description: 'Payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment attempts history retrieved',
    type: PaymentAttemptsHistoryResponseDto,
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
  async getMyPaymentAttempts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('paymentId') paymentId: string,
  ): Promise<PaymentAttemptsHistoryResponse> {
    return await this.paymentsService.getMyPaymentAttempts({
      userId: user.userId,
      paymentId,
    });
  }

  @Get('posts/:id/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get successful donations history for a post' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post donation history retrieved',
    type: PaymentPostDonationHistoryResponseDto,
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
  async getPostDonationHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
  ): Promise<PaymentPostHistoryResponse> {
    return await this.paymentsService.getPostDonationHistory({
      userId: user.userId,
      postId: params.id,
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
