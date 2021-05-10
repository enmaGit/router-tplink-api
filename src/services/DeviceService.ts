import { HttpService, Injectable } from '@nestjs/common';
import LocalStore from '../utils/localStore';
import Device from '../entities/Device';
@Injectable()
export class DeviceService {
  constructor(private httpService: HttpService) {}

  addToHostList = (device: Device): Promise<any> => {
    return this.httpService
      .get(`/userRpm/AccessCtrlHostsListsRpm.htm`, {
        params: {
          addr_type: 0,
          hosts_lists_name: device.name,
          src_ip_start: '',
          src_ip_end: '',
          mac_addr: device.mac,
          Changed: 0,
          SelIndex: 0,
          fromAdd: 0,
          Page: 1,
          Save: 'Guardar',
        },
      })
      .toPromise();
  };

  addControlRuleForDevice = (device: Device): Promise<any> => {
    return this.httpService
      .get(`/userRpm/AccessCtrlAccessRulesRpm.htm`, {
        params: {
          rule_name: device.name,
          hosts_lists: device.hostId,
          targets_lists: 255,
          scheds_lists: 255,
          enable: device.enable ? 0 : 1,
          Changed: 0,
          SelIndex: 0,
          Page: 1,
          Save: 'Guardar',
        },
      })
      .toPromise()
      .then((res) => {
        if (res.data.indexOf('errCode = "29006"') > 0) {
          throw res.data;
        }
      });
  };

  changeSetup = async (mac: string, newDeviceSetup: Device): Promise<any> => {
    const deviceList = await this.getDevices();
    const deviceInfo = deviceList.find((u) => u.mac === mac);

    if (deviceInfo.hostId < 0) {
      await this.addToHostList(deviceInfo);
      const hostId = deviceList.reduce(
        (max, device) => (device.hostId > max ? device.hostId : max),
        -1,
      );
      deviceInfo.hostId = hostId + 1;
      await LocalStore.saveStoreData(deviceList);
    }

    if (
      newDeviceSetup.enable !== undefined &&
      newDeviceSetup.enable !== deviceInfo.enable
    ) {
      if (!newDeviceSetup.enable) {
        await this.addControlRuleForDevice(deviceInfo);
        deviceInfo.enable = newDeviceSetup.enable;
      }
    }

    await LocalStore.saveStoreData(deviceList);
  };

  getDevices = async (): Promise<any> => {
    const savedData = await LocalStore.getStoreData();

    const response = await this.httpService
      .get(`/userRpm/AssignedIpAddrListRpm.htm`)
      .toPromise();

    const userList = response.data.split('SCRIPT')[1];

    if (!userList) {
      console.log('From backup');
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

    const withEnable = cleanUserList.map((user) => {
      const userSaved = savedData.find((u) => u.mac === user.mac);
      return {
        ...user,
        enable: userSaved ? userSaved.enable : true,
        hostId: userSaved ? userSaved.hostId : -1,
      };
    });

    await LocalStore.saveStoreData(withEnable);
    return withEnable;
  };
}
