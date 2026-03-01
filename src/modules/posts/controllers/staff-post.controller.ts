import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { MessageResponse } from '../../../common/types';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { PostsService } from '../services';
import { CurrentUser, Roles } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { PostStatusLifecycleDto } from '../dtos';
import { RolesGuard } from '../../../common/guards';
import { Post as Publication, UserRoles } from '@prisma/client';

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
  async getAllPosts(): Promise<Publication[]> {
    return await this.postsService.getAllPosts();
  }
}
