import { Injectable, Inject } from '@nestjs/common';
import { MessageResponse } from '../../../common/types';
import { hasUpdatableFields } from '../../../common/utils';
import { BadRequestError } from '../../../shared/errors/app-errors';
import { APP_LOGGER, AppLogger } from '../../../shared/logger/services/app-logger';
import { PasswordService } from '../../security/services';
import { UserNotFoundError, UserAlreadyExistsError } from '../errors';
import { IUserService } from '../interfaces';
import { userAdminMapper, userMapper, usersAdminMapper } from '../mappers';
import { UsersRepo } from '../repo/users-repo';
import {
  UserSecyredOutput,
  UserProfileOutput,
  NewUserInput,
  UpdateUserInput,
  UpdatePasswordInput,
  PaginatedResult,
  UserAdminOutput,
} from '../types';
import { AdminUsersQueryDto } from '../dtos';
import { UserRoles } from '@prisma/client';

@Injectable()
export class UsersService implements IUserService {
  private readonly MAX_LIMIT = 100;

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

  // Admin methods
  async findByIdForAdmin(id: string): Promise<UserAdminOutput> {
    const user = await this.repo.findById(id);
    if (!user) {
      this.logger.warn(`User with id ${id} not found for admin retrieval`);
      throw new UserNotFoundError();
    }
    return userAdminMapper(user);
  }

  async updateStatus(id: string): Promise<{ id: string; isActive: boolean }> {
    const user = await this.repo.findById(id);
    if (!user) {
      this.logger.warn(`User with id ${id} not found for status change`);
      throw new UserNotFoundError();
    }

    const isActive = !user.isActive;
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

  async deleteMany(ids: string[]): Promise<void> {
    const result = await this.repo.deleteMany(ids);
    if (result === 0) {
      this.logger.warn(`No users found for deletion`);
      throw new UserNotFoundError();
    }

    this.logger.debug(`Deleted ${result} users with ids: ${ids.join(', ')}`);
  }

  async findAllForAdmin(query: AdminUsersQueryDto): Promise<PaginatedResult<UserAdminOutput>> {
    const cleanQuery = this.normalizeAdminQuery(query);
    const activeFilters = Object.keys(query).filter((key) => query[key as keyof AdminUsersQueryDto] != null);

    this.logger.debug('Fetching users for admin', {
      page: cleanQuery.page,
      limit: cleanQuery.limit,
      activeFilters,
    });

    const result = await this.repo.findAllForAdmin(cleanQuery);

    return { ...result, data: usersAdminMapper(result.data) };
  }

  private normalizeAdminQuery(query: AdminUsersQueryDto): AdminUsersQueryDto {
    const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'email', 'name'];

    const limit = Math.min(Math.max(query.limit || 10, 1), this.MAX_LIMIT);
    const page = Math.max(query.page || 1, 1);
    const sortBy = VALID_SORT_FIELDS.includes(query.sortBy || '') ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    return {
      page,
      limit,
      email: query.email,
      name: query.name,
      isActive: query.isActive,
      isEmailVerified: query.isEmailVerified,
      role: query.role,
      sortBy,
      sortOrder,
    };
  }
}
