import { Injectable, Inject } from '@nestjs/common';
import { MessageResponse } from '../../../common/types';
import { hasUpdatableFields } from '../../../common/utils';
import { BadRequestError } from '../../../shared/errors/app-errors';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { PasswordService } from '../../security/services';
import { UserNotFoundError, UserAlreadyExistsError } from '../errors';
import { IUserService } from '../interfaces';
import { userMapper } from '../mappers';
import { UsersRepo } from '../repo/users-repo';
import { UserSecyredOutput, UserProfileOutput, NewUserInput, UpdateUserInput, UpdatePasswordInput } from '../types';
import { UserRoles } from '@prisma/client';

@Injectable()
export class UsersService implements IUserService {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    private readonly repo: UsersRepo,
    private readonly passwordService: PasswordService,
  ) {}

  async findByEmail(email: string): Promise<UserSecyredOutput | null> {
    const user = await this.repo.findByEmail(email);
    if (!user) return null;
    return user;
  }

  async findById(id: string): Promise<UserProfileOutput> {
    const user = await this.repo.findById(id);
    if (!user) {
      this.logger.warn(`User with id ${id} not found`);
      throw new UserNotFoundError();
    }
    return userMapper(user);
  }

  async create(inp: NewUserInput): Promise<{ userId: string }> {
    const existingUser = await this.repo.findByEmail(inp.email);
    if (existingUser) {
      this.logger.warn(`User with email ${inp.email} already exists`);
      throw new UserAlreadyExistsError();
    }

    const hashedPassword = await this.passwordService.createHash(inp.password);
    inp.password = hashedPassword;
    inp.name = inp.name.toLowerCase();
    const user = await this.repo.create(inp);

    return { userId: user.id };
  }

  async remove(id: string): Promise<MessageResponse> {
    await this.repo.remove(id);
    return { message: `User removed successfully` };
  }

  async updateProfile(id: string, inp: UpdateUserInput): Promise<MessageResponse> {
    if (!hasUpdatableFields(inp)) {
      throw new BadRequestError('No fields to update');
    }
    const name = inp?.name?.toLowerCase();
    await this.repo.update(id, { ...inp, name });
    return { message: `User updated successfully` };
  }

  async updatePassword(id: string, inp: UpdatePasswordInput): Promise<MessageResponse> {
    const user = await this.repo.findById(id);
    if (!user) {
      this.logger.warn(`User with id ${id} not found for password update`);
      throw new UserNotFoundError();
    }
    const isCurrentPasswordValid = await this.passwordService.verify(inp.currentPassword, user.password!);
    if (!isCurrentPasswordValid) {
      this.logger.warn(`Invalid current password for user with id ${id}`);
      throw new UserNotFoundError('Invalid current password');
    }
    const newPassword = await this.passwordService.createHash(inp.newPassword);

    await this.repo.updatePassword(id, newPassword);

    return { message: `User password updated successfully` };
  }

  async findAuthUserbyId(id: string): Promise<UserSecyredOutput | null> {
    const user = await this.repo.findById(id);
    if (!user) throw new UserNotFoundError();
    return user;
  }

  async resetPasswordThroughEmail(email: string, newPassword: string): Promise<void> {
    const user = await this.repo.findByEmail(email);
    if (!user) {
      this.logger.warn(`User with email ${email} not found for password reset`);
      throw new UserNotFoundError();
    }
    const hashedPassword = await this.passwordService.createHash(newPassword);
    await this.repo.updatePassword(user.id, hashedPassword);
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await this.repo.markEmailAsVerified(userId);
  }

  async findByIdForAdmin(id: string): Promise<UserSecyredOutput> {
    const user = await this.repo.findById(id);
    if (!user) {
      this.logger.warn(`User with id ${id} not found for admin retrieval`);
      throw new UserNotFoundError();
    }
    return user;
  }

  async updateStatus(id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> {
    const result = await this.repo.updateStatus(id, isActive);
    if (result === 0) {
      this.logger.warn(`User with id ${id} not found for status change`);
      throw new UserNotFoundError();
    }
    return { id, isActive };
  }

  async changeRoles(id: string, role: UserRoles): Promise<{ id: string; role: UserRoles }> {
    const result = await this.repo.updateRoles(id, role);
    if (result === 0) {
      this.logger.warn(`User with id ${id} not found for role change`);
      throw new UserNotFoundError();
    }
    return { id, role };
  }
}
