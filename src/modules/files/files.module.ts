import { Module } from '@nestjs/common';
import { FilesController } from './controllers';
import { CloudinaryClient } from './services/clients';
import { FilesService } from './services';

@Module({
  controllers: [FilesController],
  providers: [FilesService, CloudinaryClient],
  exports: [FilesService, CloudinaryClient],
})
export class FilesModule {}
