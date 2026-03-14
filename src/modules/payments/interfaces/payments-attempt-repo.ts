export interface IPaymentAttemptRepo {
  createPaymentAttempt(paymentId: number, provider: string, payload: string): Promise<void>;
}
