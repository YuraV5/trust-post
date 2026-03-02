import { PostReview } from '@prisma/client/wasm';
import { PostId, PostReviewStatusUpdate } from '../types/common';

export interface IPostsReviewRepo {
  assignReviewer(postId: number, reviewedById: string): Promise<PostId>;
  findById(id: number): Promise<PostReview | null>;
  findByPostId(postId: number): Promise<PostReview[]>;
  updateStatus(postId: number, data: PostReviewStatusUpdate): Promise<void>;
}
