import { Injectable, Inject } from '@nestjs/common';
import { ResponseMessage } from '../../../common/types';
import { hasUpdatableFields } from '../../../common/utils';
import { AppBadRequestException } from '../../../shared/errors/app-errors';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { PasswordService } from '../../security/services';
import { AppUserNotFoundException, AppUserAlreadyExistsException } from '../errors';
import { IUserService } from '../interfaces';
import { userAdminMapper, userMapper, usersAdminMapper } from '../mappers';
import { UsersRepo } from '../repo/users-repo';
import {
  UserSecyredOutput,
  UserProfileOutput,
  NewUserInput,
  UpdateUserInput,
  UpdatePasswordInput,
  UserAdminOutput,
  ModeratorsListOutput,
  CreateByAdminInput,
} from '../types';
import { AdminUsersQueryDto } from '../dtos';
import { Prisma, UserRoles } from '@prisma/client';
import { EmailQueueService } from '../../emails/email-queue.service';
import { REDIS_KEYS } from '../../auth/const';
import { LinksService } from '../../links/links.service';
import { generateRandomUsername } from '../../../common/utils/generate-name.util';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';
import { PaginatedResult } from '../types/paginated';
import { UserRolePeriodService } from '../../user-role-periods/services';
import { UserRolePeriodOutput } from '../../user-role-periods/types';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRolePeriodRepo } from '../../user-role-periods/repo/user-role-period.repo';

@Injectable()
export class UsersService implements IUserService {
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly repo: UsersRepo,
    private readonly passwordService: PasswordService,
    private readonly emailQueueService: EmailQueueService,
    private readonly linksService: LinksService,
    private readonly userRolePeriodService: UserRolePeriodService,
    private readonly userRolePeriodRepo: UserRolePeriodRepo,
    private readonly prismaService: PrismaService,
  ) {}

  async findByEmail(email: string): Promise<UserSecyredOutput | null> {
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
    await this.repo.remove(id);
    return { message: `Removed successfully` };
  }

  async updateProfile(id: string, inp: UpdateUserInput): Promise<ResponseMessage> {
    if (!hasUpdatableFields(inp)) {
      throw new AppBadRequestException('No fields to update');
    }
    const name = inp?.name?.toLowerCase();
    await this.repo.update(id, { ...inp, name });
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

  async findAuthUserbyId(id: string): Promise<UserSecyredOutput | null> {
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

  // Admin methods
  async findByIdForAdmin(id: string): Promise<UserAdminOutput> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }
    return userAdminMapper(user);
  }

  async createUserByAdmin(inp: CreateByAdminInput, adminId: string): Promise<ResponseMessage> {
    const result = await this.findByEmail(inp.email);
    if (result) {
      throw new AppUserAlreadyExistsException();
    }

    const name = inp.name ? inp.name.toLowerCase() : generateRandomUsername();

    const hashedPassword = await this.passwordService.createHash(inp.password);
    inp.password = hashedPassword;

    // --- TRANSACTION ---
    const user = await this.prismaService.transaction(async (tx) => {
      const createdUser = await this.repo.createByAdmin({ ...inp, name }, tx);

      // 2. Якщо роль не USER, створюємо період ролі
      if (inp.role && inp.role !== UserRoles.USER) {
        await this.userRolePeriodRepo.createPeriod(
          {
            userId: createdUser.id,
            name: createdUser.name,
            role: inp.role,
            changedById: adminId,
          },
          tx,
        );
      }

      return createdUser;
    });

    // --- SIDE EFFECT ---
    try {
      await this.emailQueueService.sendAccountActivationEmail({
        to: inp.email,
        activationUrl: await this.linksService.generateTemporaryLink(user.id, REDIS_KEYS.ACTIVATE_ACCOUNT, 3600),
      });
    } catch (error) {
      this.logger.error(`Failed to send account activation email to ${inp.email} for user ${user.id}`, {
        error: error as Error,
      });
    }

    return { message: `User created successfully, need verification` };
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

  async updateStatus(id: string): Promise<ResponseMessage> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    const isActive = !user.isActive;
    const result = await this.repo.updateStatus(id, isActive);
    if (result === 0) {
      throw new AppUserNotFoundException();
    }
    return { message: `Status ${isActive ? 'enabled' : 'disabled'} successfully` };
  }

  async changeRoles(id: string, userId: string, role: UserRoles): Promise<ResponseMessage> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    const oldRole = user.role;

    // Track role change history
    await this.userRolePeriodService.handleRoleChange({
      userId: id,
      userName: user.name,
      oldRole,
      newRole: role,
      changedById: userId,
    });

    // Update user role in the main user record
    const result = await this.repo.updateRoles(id, role);
    if (result === 0) {
      throw new AppUserNotFoundException();
    }
    return { message: `User roles updated successfully` };
  }

  async deleteMany(ids: string[]): Promise<ResponseMessage> {
    const result = await this.repo.deleteMany(ids);
    if (result === 0) {
      throw new AppUserNotFoundException();
    }
    this.logger.info(`Deleted ${result}`);
    return { message: `Deleted ${result}` };
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

  async fetchAllModerators(): Promise<ModeratorsListOutput[]> {
    const moderators = await this.repo.fetchAllModerators();
    if (moderators.length === 0) {
      this.logger.warn('No moderators found in the system');
      return [];
    }
    return moderators;
  }

  async getUserRoleHistory(userId: string): Promise<UserRolePeriodOutput[]> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AppUserNotFoundException();
    }
    return await this.userRolePeriodService.getUserRoleHistory(userId);
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
