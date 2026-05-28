import { Injectable, Inject } from '@nestjs/common';
import { ResponseMessage } from '../../../common/types';
import { hasUpdatableFields } from '../../../common/utils';
import { AppBadRequestException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { PasswordService } from '../../security/services';
import { AppUserNotFoundException, AppUserAlreadyExistsException } from '../errors';
import { IUserService } from '../interfaces';
import { userMapper } from '../mappers';
import { UsersRepo } from '../repo/users-repo';
import {
  UserSecuredOutput,
  UserProfileOutput,
  NewUserInput,
  UpdateUserInput,
  UpdatePasswordInput,
  ModeratorsListOutput,
} from '../types';
import { Prisma, UserRoles } from '@prisma/client';
import { generateRandomUsername } from '../../../common/utils/generate-name.util';
import { type IAppLogger } from '../../../shared/logger/interfaces/interface';

@Injectable()
export class UsersService implements IUserService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly repo: UsersRepo,
    private readonly passwordService: PasswordService,
  ) {}

  async findByEmail(email: string): Promise<UserSecuredOutput | null> {
    const user = await this.repo.findByEmail(email);
    if (!user) return null;
    return user;
  }

  async getUserById(id: string): Promise<UserProfileOutput> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }
    return userMapper(user);
  }

  async create(inp: NewUserInput): Promise<{ userId: string }> {
    const existingUser = await this.repo.findByEmail(inp.email);
    if (existingUser) {
      throw new AppUserAlreadyExistsException();
    }

    const hashedPassword = await this.passwordService.createHash(inp.password);
    inp.password = hashedPassword;
    inp.name = inp.name ? inp.name.toLowerCase() : generateRandomUsername();

    const user = await this.repo.create(inp);

    return { userId: user.id };
  }

  async remove(id: string): Promise<ResponseMessage> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }
    await this.repo.remove(id);
    return { message: `Removed successfully` };
  }

  async updateProfile(id: string, inp: UpdateUserInput): Promise<ResponseMessage> {
    const normalizedInput: UpdateUserInput = {
      ...inp,
      name: inp?.name?.toLowerCase(),
      photoUrl: inp?.photoUrl === '' ? null : inp?.photoUrl,
    };

    if (!hasUpdatableFields(normalizedInput)) {
      throw new AppBadRequestException('No fields to update');
    }

    await this.repo.update(id, normalizedInput);
    return { message: `Updated successfully` };
  }

  async updatePassword(id: string, inp: UpdatePasswordInput): Promise<ResponseMessage> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }
    const isCurrentPasswordValid = await this.passwordService.verify(inp.currentPassword, user.password!);
    if (!isCurrentPasswordValid) {
      throw new AppBadRequestException('Invalid credentials');
    }
    const newPassword = await this.passwordService.createHash(inp.newPassword);

    await this.repo.updatePassword(id, newPassword);

    return { message: `Password updated successfully` };
  }

  async findAuthUserById(id: string): Promise<UserSecuredOutput | null> {
    const user = await this.repo.findById(id);
    if (!user) throw new AppUserNotFoundException();
    return user;
  }

  async resetPasswordById(userId: string, newPassword: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    const hashedPassword = await this.passwordService.createHash(newPassword);
    await this.repo.updatePassword(userId, hashedPassword);
  }

  async resetPasswordThroughEmail(email: string, newPassword: string): Promise<void> {
    const user = await this.repo.findByEmail(email);
    if (!user) {
      throw new AppUserNotFoundException();
    }
    const hashedPassword = await this.passwordService.createHash(newPassword);
    await this.repo.updatePassword(user.id, hashedPassword);
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.repo.markEmailAsVerified(userId);
  }

  async activateAccount(userId: string, newPassword: string): Promise<ResponseMessage> {
    const user = await this.repo.findById(userId);
    if (!user) {
      this.logger.warn(`User with id ${userId} not found for account activation`);

      throw new AppUserNotFoundException();
    }
    const hashedPassword = await this.passwordService.createHash(newPassword);
    await this.repo.activateAccount(userId, hashedPassword);
    return { message: `Account activated successfully` };
  }

  async fetchAllModerators(): Promise<ModeratorsListOutput[]> {
    const moderators = await this.repo.fetchAllModerators();
    if (moderators.length === 0) {
      this.logger.warn('No moderators found in the system');
      return [];
    }
    return moderators;
  }

  async createByProvider(
    data: {
      email: string;
      name?: string;
      photoUrl?: string;
      isEmailVerified?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; role: UserRoles }> {
    const newUser = await this.repo.createByProvider(
      {
        email: data.email,
        name: data.name || `user_${generateRandomUsername()}`,
        photoUrl: data.photoUrl,
        isEmailVerified: data.isEmailVerified,
      },
      tx,
    );

    return { id: newUser.id, role: newUser.role };
  }
}
