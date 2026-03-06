import { Module } from '@nestjs/common';
import { FilesService } from './services/files.service';
import { FilesController } from './files.controller';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
