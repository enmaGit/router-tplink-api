import { HttpModule, HttpService, Module, OnModuleInit } from '@nestjs/common';
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
export class AppModule implements OnModuleInit {
  authService: AuthService;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  public onModuleInit() {
    this.authService = new AuthService(this.configService);

    this.httpService.axiosRef.interceptors.response.use((response) => {
      if (
        response.data.indexOf('You have no authority to access this router!') >=
          0 ||
        response.data.indexOf(
          `window.parent.location.href = "${this.authService.IP_ROOT}"`,
        ) >= 0
      ) {
        this.reAuth();
      }
      return response;
    });
  }

  async reAuth() {
    const { baseUrl, authToken } = await this.authService.authenticate();
    this.httpService.axiosRef.defaults.baseURL = baseUrl;
    this.httpService.axiosRef.defaults.headers = {
      Cookie: authToken,
      Referer: `${baseUrl}/userRpm/MenuRpm.htm`,
    };
  }
}
