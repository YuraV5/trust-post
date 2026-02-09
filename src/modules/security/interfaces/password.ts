export interface IPasswordService {
  createHash(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
}
