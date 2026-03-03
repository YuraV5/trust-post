export interface ILikeRepo {
  createLike(commentId: number, userId: string): Promise<boolean>;
  deleteLike(commentId: number, userId: string): Promise<boolean>;
}
