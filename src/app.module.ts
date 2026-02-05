import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NodeEnv } from './common/consts';
import appConfig from './configs/app/app.config';
import { configValidation } from './configs/app/env.schema';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
