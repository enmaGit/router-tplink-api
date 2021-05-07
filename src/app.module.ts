import { HttpModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { DeviceService } from './services/DeviceService';
import { AuthService } from './services/AuthService';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const { baseUrl, authToken } = await new AuthService(
          configService,
        ).authenticate();
        return {
          headers: {
            Cookie: authToken,
          },
          baseURL: baseUrl,
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AppController],
  providers: [ConfigService, DeviceService],
})
export class AppModule {}
