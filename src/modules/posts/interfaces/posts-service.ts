import { ResponseMessage } from '../../../common/types';
import { CreatePost, EditUserPostStatus, StaffPostUpdate } from '../types/common';
import { PostsQueryDto, PostsStaffQueryDto, UserPostsQueryDto } from '../dtos';
import { Post } from '@prisma/client';
import { PaginatedResult } from '../types';

export interface IPostsService {
  create(authorId: string, data: CreatePost): Promise<Post>;
  getUserPosts(userId: string, query: UserPostsQueryDto): Promise<PaginatedResult<Post>>;
  getAllPublicPosts(query: PostsQueryDto): Promise<PaginatedResult<Post>>;
  getAllStaffPosts(query: PostsStaffQueryDto): Promise<PaginatedResult<Post>>;
  findById(id: number): Promise<Post>;
  editUserPostStatus(postId: number, data: EditUserPostStatus): Promise<ResponseMessage>;
  update(postIds: number[], data: StaffPostUpdate): Promise<ResponseMessage>;
  delete(postIds: number[], statusReason?: string): Promise<ResponseMessage>;
  deleteManyByAdmin(postIds: number[], adminId: string): Promise<ResponseMessage>;
  toggleLike(postId: number, userId: string): Promise<{ message: string; liked: boolean }>;
}
