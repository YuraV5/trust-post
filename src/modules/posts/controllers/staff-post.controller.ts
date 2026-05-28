import { PostsReviewService } from './../services/posts-review.service';
import { Body, Controller, Get, Param, Patch, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ResponseMessage } from '../../../common/types';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { PostsService } from '../services';
import { CurrentUser, Roles } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { PostsStaffQueryDto, PostStatusLifecycleDto } from '../dtos';
import { RolesGuard } from '../../../common/guards';
import { PostReview, UserRoles } from '@prisma/client';
import { PaginatedResult } from '../types';
import { StaffModerationPost } from '../types/common';
import {
  MessageResponseDto,
  UnauthorizedErrorResponse,
  NotFoundErrorResponse,
} from '../../../common/swagger/responses';
import { PaginatedPostsResponseDto } from '../dtos/doc.swagger';

@ApiTags('posts-moderation')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('staff/posts')
export class StaffPostsController {
  constructor(
    private readonly postsReviewService: PostsReviewService,
    private readonly postsService: PostsService,
  ) {}

  @Roles(UserRoles.MODERATOR)
  @Patch('/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update post review status (Moderator and above)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: PostStatusLifecycleDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post status updated successfully',
    type: MessageResponseDto,
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
  async updatePostStatus(
    @Param() params: NumericIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: PostStatusLifecycleDto,
  ): Promise<ResponseMessage> {
    return await this.postsReviewService.modifyPostReviewStatus(params.id, user, data);
  }

  @Roles(UserRoles.MODERATOR)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get posts for moderation (Moderator and above)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Posts retrieved for moderation with pagination',
    type: PaginatedPostsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  async getAllPosts(
    @Query() query: PostsStaffQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<StaffModerationPost>> {
    return await this.postsService.getAllStaffPosts(query, user);
  }

  @Roles(UserRoles.MODERATOR)
  @Get('/:id/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get post status history (Moderator and above)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post status history retrieved',
    isArray: true,
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
  async getPostStatusHistory(@Param() params: NumericIdParamDto): Promise<PostReview[]> {
    return await this.postsReviewService.getPostStatusHistory(params.id);
  }
}
