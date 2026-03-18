import { Inject, Injectable } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { ResponseMessage } from '../../../common/types';
import { generateRandomUsername } from '../../../common/utils/generate-name.util';
import { AppUserAlreadyExistsException, AppUserNotFoundException } from '../../users/errors';
import { UsersRepo } from '../../users/repo/users-repo';
import { APP_LOGGER } from '../../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../../shared/logger/intefaces/interface';
import { PasswordService } from '../../security/services';
import { CreateByAdminInput, ModeratorsListOutput, UserAdminOutput } from '../../users/types';
import { userAdminMapper, usersAdminMapper } from '../../users/mappers';
import { AdminUsersQueryDto } from '../../users/dtos';
import { PaginatedResult } from '../../users/types/paginated';
import { UserRolePeriodService } from '../../user-role-periods/services';
import { UserRolePeriodOutput } from '../../user-role-periods/types';
import { UserRolePeriodRepo } from '../../user-role-periods/repo/user-role-period.repo';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../../emails/email-queue.service';
import { LinksService } from '../../links/links.service';
import { REDIS_KEYS } from '../../auth/const';
import { CommentsService } from '../../posts/comments/services/comments.service';
import { RetryFailedCommentsInput } from '../../posts/comments/types';

@Injectable()
export class AdminService {
  private readonly MAX_LIMIT = 100;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly usersRepo: UsersRepo,
    private readonly passwordService: PasswordService,
    private readonly emailQueueService: EmailQueueService,
    private readonly linksService: LinksService,
    private readonly commentsService: CommentsService,
    private readonly userRolePeriodService: UserRolePeriodService,
    private readonly userRolePeriodRepo: UserRolePeriodRepo,
    private readonly prismaService: PrismaService,
  ) {}

  async findByIdForAdmin(id: string): Promise<UserAdminOutput> {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    return userAdminMapper(user);
  }

  async createUserByAdmin(inp: CreateByAdminInput, adminId: string): Promise<ResponseMessage> {
    const existingUser = await this.usersRepo.findByEmail(inp.email);
    if (existingUser) {
      throw new AppUserAlreadyExistsException();
    }

    const name = inp.name ? inp.name.toLowerCase() : generateRandomUsername();
    const hashedPassword = await this.passwordService.createHash(inp.password);
    inp.password = hashedPassword;

    const user = await this.prismaService.transaction(async (tx) => {
      const createdUser = await this.usersRepo.createByAdmin({ ...inp, name }, tx);

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

    return { message: 'User created successfully, need verification' };
  }

  async updateStatus(id: string): Promise<ResponseMessage> {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    const isActive = !user.isActive;
    const result = await this.usersRepo.updateStatus(id, isActive);
    if (result === 0) {
      throw new AppUserNotFoundException();
    }

    return { message: `Status ${isActive ? 'enabled' : 'disabled'} successfully` };
  }

  async changeRoles(id: string, changedById: string, role: UserRoles): Promise<ResponseMessage> {
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    const result = await this.prismaService.transaction(async (tx) => {
      await this.userRolePeriodService.handleRoleChange(
        {
          userId: id,
          userName: user.name,
          oldRole: user.role,
          newRole: role,
          changedById,
        },
        tx,
      );

      return this.usersRepo.updateRoles(id, role, tx);
    });

    if (result === 0) {
      throw new AppUserNotFoundException();
    }

    return { message: 'User roles updated successfully' };
  }

  async deleteMany(ids: string[]): Promise<ResponseMessage> {
    const result = await this.usersRepo.deleteMany(ids);
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

    const result = await this.usersRepo.findAllForAdmin(cleanQuery);
    return { ...result, data: usersAdminMapper(result.data) };
  }

  async getUserRoleHistory(userId: string): Promise<UserRolePeriodOutput[]> {
    const user = await this.usersRepo.findById(userId);
    if (!user) {
      throw new AppUserNotFoundException();
    }

    return this.userRolePeriodService.getUserRoleHistory(userId);
  }

  async fetchAllModerators(): Promise<ModeratorsListOutput[]> {
    const moderators = await this.usersRepo.fetchAllModerators();
    if (moderators.length === 0) {
      this.logger.warn('No moderators found in the system');
      return [];
    }

    return moderators;
  }

  async retryFailedCommentsModeration(
    params: RetryFailedCommentsInput,
    adminId: string,
  ): Promise<{ message: string; queuedCount: number }> {
    const result = await this.commentsService.retryFailedModerationByAdmin(params, adminId);

    return {
      message: `Queued ${result.queuedCount} comment(s) for moderation retry`,
      queuedCount: result.queuedCount,
    };
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
