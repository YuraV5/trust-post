import { MessageResponse } from '../../../common/types';
import { CreatePost, PostLifecycleStatus, StaffPostUpdate } from '../types';

export interface IPostsService {
  create(authorId: string, data: CreatePost): Promise<MessageResponse>;
  getUserPosts(userId: string): Promise<any[]>;
  getAllPosts(): Promise<any[]>;
  findById(id: number): Promise<any>;
  update(postId: number, authorId: string, data: StaffPostUpdate): Promise<MessageResponse>;
  delete(postId: number, authorId: string): Promise<MessageResponse>;
  updatePostStatus(postId: number, reviewerId: string, data: PostLifecycleStatus): Promise<MessageResponse>;
}
