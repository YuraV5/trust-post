import { Module } from '@nestjs/common';
import { FilesController } from './controllers';
import { CloudinaryClientService } from './services/clients';
import { FilesService } from './services';

@Module({
  controllers: [FilesController],
  providers: [FilesService, CloudinaryClientService],
  exports: [FilesService, CloudinaryClientService],
})
export class FilesModule {}
