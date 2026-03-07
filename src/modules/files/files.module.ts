import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller';
import { CloudinaryClientService } from './services/clients';
import { FilesService } from './services';
import { AdminFilesController } from './controllers';

@Module({
  controllers: [FilesController, AdminFilesController],
  providers: [FilesService, CloudinaryClientService],
  exports: [FilesService],
})
export class FilesModule {}
