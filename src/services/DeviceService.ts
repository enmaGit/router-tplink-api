import { HttpService, Injectable } from '@nestjs/common';
import { escape } from 'html-escaper';
import { ConfigService } from '@nestjs/config';
import LocalStore from '../utils/localStore';
import { AuthService } from './AuthService';

@Injectable()
export class DeviceService {
  constructor(
    private httpService: HttpService,
  ) {}

  getDevices = async (): Promise<any> => {
    const savedData = await LocalStore.getStoreData();

    const response = await this.httpService
      .get(`/userRpm/AssignedIpAddrListRpm.htm`)
      .toPromise();

    const userList = response.data.split('SCRIPT')[1];

    if (!userList) {
      console.log('From backup')
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
    return cleanUserList;
  };
}
