import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PostsService } from '../services';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { CurrentUser, PublicRoute, RequireIdempotencyKey } from '../../../common/decorators';
import { ResponseMessage } from '../../../common/types';
import { CreatePostDto } from '../dtos/create-post.dto';
import { NumericIdParamDto } from '../../../common/dtos/req-params.dto';
import { Post as Publication } from '@prisma/client';
import { UpdatePostDto, PostsQueryDto, UserPostsQueryDto, ModifyUserPostStatusDto } from '../dtos';
import { PaginatedResult, PublicPostDetails, PublicPostWithMainImage } from '../types';
import { DeletePostByUserDto } from '../dtos/delete.dto';
import { OwnershipGuard } from '../../../common/guards';
import {
  MessageResponseDto,
  BadRequestErrorResponse,
  UnauthorizedErrorResponse,
  NotFoundErrorResponse,
  ValidationErrorResponse,
} from '../../../common/swagger/responses';
import { PostBaseResponseDto, PostResponseDto, PaginatedPostsResponseDto } from '../dtos/doc.swagger';

@ApiTags('posts')
@Controller('posts')
export class PublicPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @RequireIdempotencyKey()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create new post' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Post created successfully',
    type: PostBaseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid post data',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() inp: CreatePostDto): Promise<Publication> {
    return await this.postsService.create(user.userId, inp);
  }

  @Get()
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List public posts (paginated, searchable)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search query' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Posts retrieved with pagination metadata',
    type: PaginatedPostsResponseDto,
  })
  async getAllPosts(@Query() query: PostsQueryDto): Promise<PaginatedResult<PublicPostWithMainImage>> {
    return await this.postsService.getAllPublicPosts(query);
  }

  @Get('my')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user posts (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User posts retrieved',
    type: PaginatedPostsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  async getUserPosts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UserPostsQueryDto,
  ): Promise<PaginatedResult<PublicPostWithMainImage>> {
    return await this.postsService.getUserPosts(user.userId, query);
  }

  @Post('/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Like or unlike a post' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Like status toggled',
    schema: { properties: { message: { type: 'string' }, liked: { type: 'boolean' } } },
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
  async togglePostLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
  ): Promise<{ message: string; liked: boolean }> {
    return await this.postsService.toggleLike(params.id, user.userId);
  }

  @UseGuards(OwnershipGuard({ model: 'post' }))
  @Patch('/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update post status (owner only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: ModifyUserPostStatusDto })
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
    status: HttpStatus.FORBIDDEN,
    description: 'Not the post owner',
  })
  async modifyPostStatus(
    @Param() params: NumericIdParamDto,
    @Body() inp: ModifyUserPostStatusDto,
  ): Promise<ResponseMessage> {
    return await this.postsService.editUserPostStatus(params.id, inp);
  }

  @UseGuards(OwnershipGuard({ model: 'post' }))
  @Patch('/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update post details (owner only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePostDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post updated successfully',
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
    status: HttpStatus.FORBIDDEN,
    description: 'Not the post owner',
  })
  async editPostDetails(@Param() params: NumericIdParamDto, @Body() inp: UpdatePostDto): Promise<ResponseMessage> {
    return await this.postsService.update([params.id], inp);
  }

  @UseGuards(OwnershipGuard({ model: 'post' }))
  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete post (owner only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: DeletePostByUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not the post owner',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
    type: NotFoundErrorResponse,
  })
  async deletePost(@Param() params: NumericIdParamDto, @Body() inp: DeletePostByUserDto): Promise<ResponseMessage> {
    return await this.postsService.delete([params.id], inp.statusReason);
  }

  @Get('/my/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user post by ID (any status)' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User post retrieved successfully',
    type: PostBaseResponseDto,
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
  async getMyPostById(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: NumericIdParamDto,
  ): Promise<Publication> {
    return await this.postsService.findByIdForAuthor(params.id, user.userId);
  }

  @Get('/:id')
  @PublicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Post retrieved successfully',
    type: PostResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Post not found',
    type: NotFoundErrorResponse,
  })
  async getPostById(@Param() params: NumericIdParamDto): Promise<PublicPostDetails> {
    return await this.postsService.findById(params.id);
  }
}
