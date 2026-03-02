import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { MessageResponse } from '../../../common/types';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { PostsService } from '../services';
import { CurrentUser, Roles } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { PostStatusLifecycleDto, PostsStaffQueryDto } from '../dtos';
import { RolesGuard } from '../../../common/guards';
import { Post as Publication, UserRoles } from '@prisma/client';
import { PaginatedResult } from '../types';

@UseGuards(RolesGuard)
@Controller('staff/posts')
export class StaffPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Roles(UserRoles.MODERATOR)
  @Patch('/:id/status')
  async updatePostStatus(
    @Param() params: NumericIdParamDto,
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: PostStatusLifecycleDto,
  ): Promise<MessageResponse> {
    return await this.postsService.updatePostStatus(params.id, user.userId, data);
  }

  @Roles(UserRoles.MODERATOR)
  @Get()
  async getAllPosts(@Query() query: PostsStaffQueryDto): Promise<PaginatedResult<Publication>> {
    return await this.postsService.getAllStaffPosts(query);
  }
}
