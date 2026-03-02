import { PostsReviewService } from './../services/posts-review.service';
import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { MessageResponse } from '../../../common/types';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { PostsService } from '../services';
import { CurrentUser, Roles } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { PostsStaffQueryDto, PostStatusLifecycleDto } from '../dtos';
import { RolesGuard } from '../../../common/guards';
import { PostReview, Post as Publication, UserRoles } from '@prisma/client';
import { PaginatedResult } from '../types';
import { DeleteManyPostsDto } from '../dtos/delete.dto';

@UseGuards(RolesGuard)
@Controller('staff/posts')
export class StaffPostsController {
  constructor(
    private readonly postsReviewService: PostsReviewService,
    private readonly postsService: PostsService,
  ) {}

  @Roles(UserRoles.MODERATOR)
  @Patch('/:id/status')
  async updatePostStatus(
    @Param() params: NumericIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: PostStatusLifecycleDto,
  ): Promise<MessageResponse> {
    return await this.postsReviewService.modifyPostReviewStatus(params.id, user.userId, data);
  }

  @Roles(UserRoles.MODERATOR)
  @Get()
  async getAllPosts(@Query() query: PostsStaffQueryDto): Promise<PaginatedResult<Publication>> {
    return await this.postsService.getAllStaffPosts(query);
  }

  @Roles(UserRoles.MODERATOR)
  @Get('/:id/history')
  async getPostStatusHistory(@Param() params: NumericIdParamDto): Promise<PostReview[]> {
    return await this.postsReviewService.getPostStatusHistory(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Delete('/remove')
  async deletePosts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: DeleteManyPostsDto,
  ): Promise<MessageResponse> {
    return await this.postsReviewService.purgePostReviewDataByAdmin(data.postIds, user.userId);
  }
}
