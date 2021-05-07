import { escape } from 'html-escaper';
import { ConfigService } from '@nestjs/config';
import Encrypt from '../utils/encrypt';
const axios = require('axios').default;

export class AuthService {
  constructor(private configService: ConfigService) {}

  IP_ROOT = 'http://192.168.0.1';

  baseAuthUrl = '';
  authToken = '';

  authenticate = async (): Promise<any> => {
    const user = this.configService.get<string>('USER_ADMIN');
    const pass = this.configService.get<string>('PASS_ADMIN');

    const password = Encrypt.hexMd5(pass);

    const auth = `Basic ${Encrypt.base64Encoding(`${user}:${password}`)}`;
    this.authToken = `Authorization=${escape(auth)};path=/`;

    const { data } = await axios
      .get(`${this.IP_ROOT}/userRpm/LoginRpm.htm?Save=Save`, {
        headers: {
          Cookie: this.authToken
        },
      });

    const baseUrlToken = data.split('"')[3].split('/')[3];

    this.baseAuthUrl = `${this.IP_ROOT}/${baseUrlToken}`;

    return { baseUrl: this.baseAuthUrl, authToken: this.authToken };
  };

  logout = (): Promise<any> => {
    return axios
      .get(`${this.baseAuthUrl}/userRpm/LogoutRpm.htm`, {
        headers: {
          Cookie: this.authToken,
          Referer: `${this.baseAuthUrl}/userRpm/MenuRpm.htm`,
        },
      });
  };
}
