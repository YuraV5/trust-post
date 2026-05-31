import { ResponseMessage } from '../../../common/types';
import {
  CreatePost,
  EditUserPostStatus,
  PublicPostDetails,
  PublicPostWithMainImage,
  StaffModerationPost,
  StaffPostUpdate,
} from '../types/common';
import { PostsQueryDto, PostsStaffQueryDto, UserPostsQueryDto } from '../dtos';
import { AuthenticatedUser } from '../../../common/interfaces';
import { Post } from '@prisma/client';
import { PaginatedResult } from '../types';

export interface IPostsService {
  create(authorId: string, data: CreatePost): Promise<Post>;
  getUserPosts(userId: string, query: UserPostsQueryDto): Promise<PaginatedResult<PublicPostWithMainImage>>;
  getAllPublicPosts(query: PostsQueryDto, authorization?: string): Promise<PaginatedResult<PublicPostWithMainImage>>;
  getAllStaffPosts(
    query: PostsStaffQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedResult<StaffModerationPost>>;
  findById(id: number, authorization?: string): Promise<PublicPostDetails>;
  findByIdForAuthor(id: number, authorId: string): Promise<Post>;
  editUserPostStatus(postId: number, data: EditUserPostStatus): Promise<ResponseMessage>;
  update(postIds: number[], data: StaffPostUpdate): Promise<ResponseMessage>;
  delete(postIds: number[], statusReason?: string): Promise<ResponseMessage>;
  deleteManyByAdmin(postIds: number[], adminId: string): Promise<ResponseMessage>;
  toggleLike(postId: number, userId: string): Promise<{ message: string; liked: boolean; totalLikes: number }>;
}
