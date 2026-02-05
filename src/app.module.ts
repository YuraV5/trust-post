import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NodeEnv } from './common/consts';
import appConfig from './configs/app/app.config';
import { configValidation } from './configs/app/env.schema';
import { AppLoggerModule } from './shared/logger/app-logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === NodeEnv.DEV || process.env.NODE_ENV === NodeEnv.TEST
          ? `.env.${process.env.NODE_ENV}`
          : [],
      load: [appConfig],
      validationSchema: configValidation,
    }),
    AppLoggerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
