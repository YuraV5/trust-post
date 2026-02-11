import { APP_LOGGER, AppLogger } from './../../shared/logger/services/app-logger';
import { Inject, Injectable } from '@nestjs/common';
import { IUserService } from './interfaces';
import { MessageResponse } from '../../common/types';
import { UserSecyredOutput, NewUserInput, UpdateUserInput, UpdatePasswordInput, UserProfileOutput } from './types';
import { UsersRepo } from './repo/users-repo';
import { UserAlreadyExistsError, UserNotFoundError } from './errors';
import { PasswordService } from '../security/services';
import { BadRequestError } from '../../shared/errors/app-errors';
import { hasUpdatableFields } from '../../common/utils';
import { userMapper } from './mappers';

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

  async create(inp: NewUserInput): Promise<MessageResponse> {
    const existingUser = await this.repo.findByEmail(inp.email);
    if (existingUser) {
      this.logger.warn(`User with email ${inp.email} already exists`);
      throw new UserAlreadyExistsError();
    }

    const hashedPassword = await this.passwordService.createHash(inp.password);
    inp.password = hashedPassword;
    inp.name = inp.name.toLowerCase();
    await this.repo.create(inp);

    return { message: `User created successfully` };
  }

  async remove(id: string): Promise<MessageResponse> {
    await this.repo.remove(id);
    this.logger.info(`User with id ${id} removed successfully`);
    return { message: `User removed successfully` };
  }

  async update(id: string, inp: UpdateUserInput): Promise<MessageResponse> {
    if (!hasUpdatableFields(inp)) {
      throw new BadRequestError('No fields to update');
    }
    const name = inp?.name?.toLowerCase();
    await this.repo.update(id, { ...inp, name });
    this.logger.info(`User with id ${id} updated successfully`);
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

    this.logger.info(`User with id ${user.id} updated password successfully`);
    return { message: `User password updated successfully` };
  }

  async findAuthUserbyId(id: string): Promise<UserSecyredOutput | null> {
    const user = await this.repo.findById(id);
    if (!user) throw new UserNotFoundError();
    return user;
  }
}
