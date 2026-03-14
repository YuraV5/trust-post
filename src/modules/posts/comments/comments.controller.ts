import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { ResponseMessage } from '../../../common/types';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { CurrentUser, PublicRoute, Roles } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CreateCommentDto, UpdateCommentDto, CommentsQueryDto, PostIdParamDto, DeleteCommentsDto } from './dtos';
import { RolesGuard, OwnershipGuard } from '../../../common/guards';
import { UserRoles, Comment } from '@prisma/client';
import { PaginatedResult } from './types';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('comments/:id/like')
  async toggleCommentLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
  ): Promise<{ message: string; liked: boolean }> {
    return await this.commentsService.toggleLike(params.id, user.userId);
  }

  @Post('posts/:postId/comments')
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
  async getCommentsByPostId(
    @Param() params: PostIdParamDto,
    @Query() query: CommentsQueryDto,
  ): Promise<PaginatedResult<Comment>> {
    return await this.commentsService.getCommentsByPostId(params.postId, query);
  }

  @UseGuards(OwnershipGuard({ model: 'comment' }))
  @Patch('comments/:id')
  async updateComment(@Param() params: NumericIdParamDto, @Body() data: UpdateCommentDto): Promise<ResponseMessage> {
    return await this.commentsService.update(params.id, data);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRoles.MODERATOR)
  @Delete('comments/moderate')
  async deleteCommentsByModerator(@Body() data: DeleteCommentsDto): Promise<ResponseMessage> {
    return await this.commentsService.deleteByModerator(data.ids);
  }

  @UseGuards(OwnershipGuard({ model: 'comment' }))
  @Delete('comments/:id')
  async deleteComment(@Param() params: NumericIdParamDto): Promise<ResponseMessage> {
    return await this.commentsService.delete(params.id);
  }
}
