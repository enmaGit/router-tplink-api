import { HttpService, Injectable } from '@nestjs/common';
import { escape } from 'html-escaper';
import { ConfigService } from '@nestjs/config';
import Encrypt from './utils/encrypt';
import LocalStore from './utils/localStore';

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  IP_ROOT = 'http://192.168.0.1';

  baseAuthUrl = '';
  authToken = '';

  authenticate = async (): Promise<void> => {
    const user = this.configService.get<string>('USER_ADMIN');
    const pass = this.configService.get<string>('PASS_ADMIN');

    const password = Encrypt.hexMd5(pass);

    const auth = `Basic ${Encrypt.base64Encoding(`${user}:${password}`)}`;
    this.authToken = `Authorization=${escape(auth)};path=/`;

    const { data } = await this.httpService
      .get(`${this.IP_ROOT}/userRpm/LoginRpm.htm?Save=Save`, {
        headers: {
          Cookie: this.authToken,
        },
      })
      .toPromise();

    const baseUrlToken = data.split('"')[3].split('/')[3];

    this.baseAuthUrl = `${this.IP_ROOT}/${baseUrlToken}`;
  };

  logout = (): Promise<any> => {
    return this.httpService
      .get(`${this.baseAuthUrl}/userRpm/LogoutRpm.htm`, {
        headers: {
          Cookie: this.authToken,
          Referer: `${this.baseAuthUrl}/userRpm/MenuRpm.htm`,
        },
      })
      .toPromise();
  };

  getUserList = async (): Promise<any> => {
    await this.authenticate();
    const savedData = await LocalStore.getStoreData();

    const response = await this.httpService
      .get(`${this.baseAuthUrl}/userRpm/AssignedIpAddrListRpm.htm`, {
        headers: {
          Cookie: this.authToken,
          Referer: `${this.baseAuthUrl}/userRpm/MenuRpm.htm`,
        },
      })
      .toPromise();

    const userList = response.data.split('SCRIPT')[1];

    if (!userList) {
      console.log('Este es el de respaldo');
      return savedData;
    }

    const dirtyList = userList.split('Array(')[1].replace('/\n', '');
    const lastCommaIdx = dirtyList.lastIndexOf('"');

    const cleanList = dirtyList.substring(0, lastCommaIdx + 1).replace(' ', '');

    const allInfo = JSON.parse(`[${cleanList}]`);

    const dirtyUsers = allInfo.reduce(
      (acum, current, idx) => {
        const [obj, ...objs] = acum;
        if (idx % 4 === 0) {
          obj.name = current;
          return acum;
        } else if (idx % 4 === 1) {
          obj.mac = current;
          return acum;
        } else if (idx % 4 === 2) {
          obj.ip = current;
          return acum;
        } else if (idx % 4 === 3) {
          obj.lastConnection = current;
          return [{}, obj, ...objs];
        }
      },
      [{}],
    );

    const [_, ...cleanUserList] = dirtyUsers;

    await LocalStore.saveStoreData(cleanUserList);
    await this.logout();
    return cleanUserList;
  };
}
