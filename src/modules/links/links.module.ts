import { Module } from '@nestjs/common';
import { LinksService } from './links.service';

@Module({
  imports: [],
  providers: [LinksService],
  exports: [LinksService],
})
export class LinksModule {}
