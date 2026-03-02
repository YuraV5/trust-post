import { MessageResponse } from '../../../common/types';
import { CreatePost, PaginatedResult, PostLifecycleStatus, StaffPostUpdate } from '../types';
import { PostsQueryDto, PostsStaffQueryDto, UserPostsQueryDto } from '../dtos';
import { Post } from '@prisma/client';

export interface IPostsService {
  create(authorId: string, data: CreatePost): Promise<MessageResponse>;
  getUserPosts(userId: string, query: UserPostsQueryDto): Promise<PaginatedResult<Post>>;
  getAllPublicPosts(query: PostsQueryDto): Promise<PaginatedResult<Post>>;
  getAllStaffPosts(query: PostsStaffQueryDto): Promise<PaginatedResult<Post>>;
  findById(id: number): Promise<any>;
  update(postId: number, authorId: string, data: StaffPostUpdate): Promise<MessageResponse>;
  delete(postId: number, authorId: string): Promise<MessageResponse>;
  updatePostStatus(postId: number, reviewerId: string, data: PostLifecycleStatus): Promise<MessageResponse>;
}
