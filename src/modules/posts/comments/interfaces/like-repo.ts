export interface ICommentLikeRepo {
  createLike(commentId: number, userId: string): Promise<boolean>;
  deleteLike(commentId: number, userId: string): Promise<boolean>;
}
