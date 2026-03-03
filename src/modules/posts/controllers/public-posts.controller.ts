import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PostsService } from '../services';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CurrentUser, PublicRoute } from '../../../common/decorators';
import { MessageResponse } from '../../../common/types';
import { CreatePostDto } from '../dtos/create-post.dto';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { Post as Publication } from '@prisma/client';
import { UpdatePostDto, PostsQueryDto, UserPostsQueryDto, ModifyUserPostStatusDto } from '../dtos';
import { PaginatedResult } from '../types';
import { DeletePostByUserDto } from '../dtos/delete.dto';

@Controller('posts')
export class PublicPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() inp: CreatePostDto): Promise<Publication> {
    return await this.postsService.create(user.userId, inp);
  }

  @Get()
  @PublicRoute()
  async getAllPosts(@Query() query: PostsQueryDto): Promise<PaginatedResult<Publication>> {
    return await this.postsService.getAllPublicPosts(query);
  }

  @Get('my')
  async getUserPosts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UserPostsQueryDto,
  ): Promise<PaginatedResult<Publication>> {
    return await this.postsService.getUserPosts(user.userId, query);
  }

  @Get('/:id')
  async getPostById(@Param() params: NumericIdParamDto): Promise<Publication> {
    return await this.postsService.findById(params.id);
  }

  @Patch('/:id')
  async editPostDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
    @Body() inp: UpdatePostDto,
  ): Promise<MessageResponse> {
    return await this.postsService.update([params.id], user.userId, inp);
  }

  @Patch('/:id/status')
  async modifyPostStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
    @Body() inp: ModifyUserPostStatusDto,
  ): Promise<MessageResponse> {
    return await this.postsService.editUserPostStatus(params.id, inp);
  }

  @Post('/:id/like')
  async togglePostLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
  ): Promise<{ message: string; liked: boolean }> {
    return await this.postsService.toggleLike(params.id, user.userId);
  }

  @Delete('/:id')
  async deletePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
    @Body() inp: DeletePostByUserDto,
  ): Promise<MessageResponse> {
    return await this.postsService.delete([params.id], inp.statusReason);
  }
}
