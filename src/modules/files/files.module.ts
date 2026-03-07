import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller';
import { CloudinaryClientService } from './services/clients';
import { FilesService, PostFilesService } from './services';
import { AdminFilesController } from './controllers';
import { PostFilesRepo } from './repos';

@Module({
  controllers: [FilesController, AdminFilesController],
  providers: [FilesService, PostFilesService, PostFilesRepo, CloudinaryClientService],
  exports: [FilesService, PostFilesService],
})
export class FilesModule {}
