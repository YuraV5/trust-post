export interface IPasswordService {
  createHashe(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
}
