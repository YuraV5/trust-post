import { Module } from '@nestjs/common';
import { PostFilesController, AdminFilesController } from './controllers';
import { PostFilesService } from './services';
import { PostFilesRepo } from './repos';
import { FilesModule } from '../../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [PostFilesController, AdminFilesController],
  providers: [PostFilesService, PostFilesRepo],
  exports: [PostFilesService, PostFilesRepo],
})
export class PostsFilesModule {}
