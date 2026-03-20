import { Body, Controller, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { CurrentUser, Roles } from '../../../common/decorators';
import { RolesGuard } from '../../../common/guards';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { ResponseMessage } from '../../../common/types';
import { MessageResponseDto, UnauthorizedErrorResponse } from '../../../common/swagger/responses';
import { DeleteManyPostsDto } from '../../posts/dtos/delete.dto';
import { PostsReviewService } from '../../posts/services';

@ApiTags('admin-posts')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly postsReviewService: PostsReviewService) {}

  @Roles(UserRoles.ADMIN)
  @Delete('/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete posts (Admin only)' })
  @ApiBody({ type: DeleteManyPostsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Posts deleted permanently',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  async deletePosts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() data: DeleteManyPostsDto,
  ): Promise<ResponseMessage> {
    return this.postsReviewService.purgePostReviewDataByAdmin(data.postIds, user.userId);
  }
}
