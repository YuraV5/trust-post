import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CommentsService } from './services/comments.service';
import { ResponseMessage } from '../../../common/types';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { CurrentUser, PublicRoute, Roles } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CreateCommentDto, UpdateCommentDto, CommentsQueryDto, PostIdParamDto, DeleteCommentsDto } from './dtos';
import { RolesGuard, OwnershipGuard } from '../../../common/guards';
import { UserRoles, Comment } from '@prisma/client';
import { PaginatedResult } from './types';
import { TokensService } from '../../security/services';
import {
  MessageResponseDto,
  BadRequestErrorResponse,
  UnauthorizedErrorResponse,
  NotFoundErrorResponse,
  ValidationErrorResponse,
} from '../../../common/swagger/responses';
import { PaginatedCommentsResponseDto } from '../dtos/doc.swagger';

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('comments/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Like or unlike a comment' })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment like toggled',
    schema: { properties: { message: { type: 'string' }, liked: { type: 'boolean' } } },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
    type: NotFoundErrorResponse,
  })
  async toggleCommentLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
  ): Promise<{ message: string; liked: boolean }> {
    return await this.commentsService.toggleLike(params.id, user.userId);
  }

  @Post('posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create comment on post' })
  @ApiParam({ name: 'postId', type: Number, description: 'Post ID' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Comment created successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid comment data',
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
  async createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: PostIdParamDto,
    @Body() data: CreateCommentDto,
  ): Promise<ResponseMessage> {
    return await this.commentsService.create(params.postId, user.userId, {
      postId: params.postId,
      content: data.content,
    });
  }

  @Get('posts/:postId/comments')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get post comments (paginated)' })
  @ApiParam({ name: 'postId', type: Number, description: 'Post ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['newest', 'oldest'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comments retrieved with pagination',
    type: PaginatedCommentsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
    type: NotFoundErrorResponse,
  })
  async getCommentsByPostId(
    @Param() params: PostIdParamDto,
    @Query() query: CommentsQueryDto,
    @Headers('authorization') authorization?: string,
  ): Promise<PaginatedResult<Comment>> {
    const viewerId = await this.commentsService.resolveViewerId(authorization);
    return await this.commentsService.getCommentsByPostId(params.postId, query, viewerId);
  }

  @UseGuards(OwnershipGuard({ model: 'comment' }))
  @Patch('comments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update comment (owner only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
    type: ValidationErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
    type: NotFoundErrorResponse,
  })
  async updateComment(@Param() params: NumericIdParamDto, @Body() data: UpdateCommentDto): Promise<ResponseMessage> {
    return await this.commentsService.update(params.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRoles.MODERATOR)
  @Delete('comments/moderate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete comments as moderator' })
  @ApiBody({ type: DeleteCommentsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comments deleted by moderator',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  async deleteCommentsByModerator(@Body() data: DeleteCommentsDto): Promise<ResponseMessage> {
    return await this.commentsService.deleteByModerator(data.ids);
  }

  @UseGuards(OwnershipGuard({ model: 'comment' }))
  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete comment (owner only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
    type: NotFoundErrorResponse,
  })
  async deleteComment(@Param() params: NumericIdParamDto): Promise<ResponseMessage> {
    return await this.commentsService.delete(params.id);
  }
}
