import { MessageResponse } from '../../../common/types';
import { CreatePost, StaffPostUpdate } from '../types/common';
import { PostsQueryDto, PostsStaffQueryDto, UserPostsQueryDto } from '../dtos';
import { Post } from '@prisma/client';
import { PaginatedResult } from '../types';

export interface IPostsService {
  create(authorId: string, data: CreatePost): Promise<MessageResponse>;
  getUserPosts(userId: string, query: UserPostsQueryDto): Promise<PaginatedResult<Post>>;
  getAllPublicPosts(query: PostsQueryDto): Promise<PaginatedResult<Post>>;
  getAllStaffPosts(query: PostsStaffQueryDto): Promise<PaginatedResult<Post>>;
  findById(id: number): Promise<any>;
  update(postIds: number[], authorId: string, data: StaffPostUpdate): Promise<MessageResponse>;
  delete(postIds: number[], authorId: string): Promise<MessageResponse>;
}
