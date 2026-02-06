import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { IHashing } from '../interfaces';

@Injectable()
export class HashingService implements IHashing {
  async hash(value: string): Promise<string> {
    return await argon2.hash(value);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, value);
  }
}
