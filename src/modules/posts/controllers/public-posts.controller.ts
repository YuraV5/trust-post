import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PostsService } from '../services';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CurrentUser } from '../../../common/decorators';
import { MessageResponse } from '../../../common/types';
import { CreatePostDto } from '../dtos/create-post.dto';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { Post as Publication } from '@prisma/client';
import { UpdatePostDto } from '../dtos';

@Controller('posts')
export class PublicPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() inp: CreatePostDto): Promise<MessageResponse> {
    return await this.postsService.create(user.userId, inp);
  }

  @Get()
  async getAllPosts(): Promise<Publication[]> {
    return await this.postsService.getAllPosts();
  }

  @Get('my')
  async getUserPosts(@CurrentUser() user: AuthenticatedUser): Promise<Publication[]> {
    return await this.postsService.getUserPosts(user.userId);
  }

  @Get('/:id')
  async getPostById(@Param() params: NumericIdParamDto): Promise<Publication> {
    return await this.postsService.findById(params.id);
  }

  @Patch('/:id')
  async updatePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
    @Body() inp: UpdatePostDto,
  ): Promise<MessageResponse> {
    return await this.postsService.update(params.id, user.userId, inp);
  }

  @Delete('/:id')
  async deletePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
  ): Promise<MessageResponse> {
    return await this.postsService.delete(params.id, user.userId);
  }
}
