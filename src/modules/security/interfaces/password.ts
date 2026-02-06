export interface IPasswordService {
  generate(password: string): Promise<string>;
  compare(password: string, stored: string): Promise<boolean>;
}
