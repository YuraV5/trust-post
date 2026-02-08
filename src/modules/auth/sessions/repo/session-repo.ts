import { Injectable } from '@nestjs/common';
import { ISessionRepo } from '../interfaces';
import { Session } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserSession } from '../types';

@Injectable()
export class SessionsRepo implements ISessionRepo {
  constructor(private readonly db: PrismaService) {}

  async findByUserId(userId: string): Promise<Session[]> {
    return this.db.session.findMany({ where: { userId } });
  }

  async findByUserIdAndDeviceId(userId: string, deviceId: string): Promise<Session | null> {
    return this.db.session.findFirst({ where: { userId, deviceId } });
  }

  async create(data: UserSession): Promise<Session> {
    return await this.db.session.create({ data });
  }

  async update(sessionId: string, data: Partial<Session>): Promise<Session> {
    return await this.db.session.update({ where: { id: sessionId }, data });
  }

  async deleteByUserAndDevice(userId: string, deviceId: string): Promise<number> {
    const res = await this.db.session.deleteMany({
      where: { userId, deviceId },
    });

    return res.count;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.db.session.deleteMany({ where: { userId } });
    return result.count;
  }

  async deleteByUserIdExcept(userId: string, exceptDeviceId: string): Promise<number> {
    const result = await this.db.session.deleteMany({ where: { userId, NOT: { deviceId: exceptDeviceId } } });
    return result.count;
  }

  async deleteManyByIds(ids: string[]): Promise<number> {
    const result = await this.db.session.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }
}
