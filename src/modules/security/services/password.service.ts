import argon2 from 'argon2';
import { IPasswordService } from '../interfaces';

export class PasswordService implements IPasswordService {
  async createHashe(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  }

  async verify(password: string, stored: string): Promise<boolean> {
    return argon2.verify(stored, password);
  }
}
