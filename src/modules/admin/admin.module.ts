import { Module } from '@nestjs/common';
import { AppLoggerModule } from '../../shared/logger/app-logger.module';
import { SecurityModule } from '../security/security.module';
import { EmailsModule } from '../emails/emails.module';
import { LinksModule } from '../links/links.module';
import { UserRolePeriodsModule } from '../user-role-periods/user-role-periods.module';
import { PostsModule } from '../posts/posts.module';
import { AdminCommentsController, AdminPostsController, AdminUsersController } from './controllers';
import { AdminService } from './services';
import { UsersRepo } from '../users/repo/users-repo';
import { CommentsModule } from '../posts/comments/comments.module';

@Module({
  imports: [AppLoggerModule, SecurityModule, EmailsModule, LinksModule, UserRolePeriodsModule, CommentsModule, PostsModule],
  controllers: [AdminUsersController, AdminCommentsController, AdminPostsController],
  providers: [AdminService, UsersRepo],
  exports: [AdminService],
})
export class AdminModule {}
