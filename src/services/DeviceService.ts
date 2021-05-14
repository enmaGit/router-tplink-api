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

  changeControlRule = (device: Device, ruleId: number): Promise<any> => {
    return this.httpService
      .get(`/userRpm/AccessCtrlAccessRulesRpm.htm`, {
        params: {
          enable: device.enable ? 0 : 1,
          enableId: ruleId,
          Page: 1,
        },
      })
      .toPromise();
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
      const rules = await this.getEnableRules();
      const ruleIdx = rules.findIndex((r) => r.hostId === deviceInfo.hostId);
      if (ruleIdx >= 0) {
        deviceInfo.enable = newDeviceSetup.enable;
        await this.changeControlRule(deviceInfo, ruleIdx);
      } else {
        deviceInfo.enable = newDeviceSetup.enable;
        await this.addControlRuleForDevice(deviceInfo);
      }
    }

    if (
      newDeviceSetup.name !== undefined &&
      newDeviceSetup.name !== deviceInfo.name
    ) {
      deviceInfo.name = newDeviceSetup.name;
    }

    if (
      newDeviceSetup.type !== undefined &&
      newDeviceSetup.type !== deviceInfo.type
    ) {
      deviceInfo.type = newDeviceSetup.type;
    }

    await LocalStore.saveStoreData(deviceList);
  };

  getEnableRules = async (): Promise<any> => {
    return this.httpService
      .get(`/userRpm/AccessCtrlAccessRulesRpm.htm`)
      .toPromise()
      .then((res) => {
        const partData = res.data
          .split('SCRIPT')[1]
          ?.split('Array(')[1]
          .split(' );')[0]
          .split(',')
          .map((value) =>
            isNaN(value.trim()) ? value.trim() : parseInt(value.trim()),
          );
        const dirtyRules = partData
          ?.reduce(
            (acum, current, idx) => {
              const [obj, ...objs] = acum;
              if (idx % 8 === 1) {
                obj.hostId = current;
                return acum;
              } else if (idx % 8 === 7) {
                obj.enable = current === 0 ? true : false;
                return [{}, obj, ...objs];
              }
              return acum;
            },
            [{}],
          )
          .filter((rule) => rule.enable !== undefined)
          .reverse();
        return dirtyRules || [];
      });
  };

  getCurrentStatistics = async (): Promise<any> => {
    return this.httpService
      .get(`/userRpm/SystemStatisticRpm.htm`, {
        params: {
          interval: 5,
          autoRefresh: 2,
          sortType: 1,
          Num_per_page: 100,
          Goto_page: 1,
        },
      })
      .toPromise()
      .then((res) => {
        const partData = res.data
          .split('SCRIPT')[1]
          ?.split('Array(')[1]
          .split(' );')[0]
          .split(',')
          .map((value) =>
            isNaN(value.trim()) ? value.trim() : parseInt(value.trim()),
          );
        const bytesDownloaded = partData?.reduce(
          (acum, current, idx) => {
            const [obj, ...objs] = acum;
            if (idx % 13 === 2) {
              obj.mac = current.split('"').join('');
              return acum;
            } else if (idx % 13 === 4) {
              obj.bytes = current;
              return acum;
            } else if (idx % 13 === 12) {
              return [{}, obj, ...objs];
            }
            return acum;
          },
          [{}],
        );
        return bytesDownloaded || [];
      });
  };

  getDevices = async (): Promise<Array<Device>> => {
    const rules = await this.getEnableRules();

    const savedData = await LocalStore.getStoreData().then((devices) =>
      devices.map((device) => {
        if (device.hostId > -1) {
          const rule = rules.find((rule) => rule.hostId === device.hostId);
          if (rule) {
            device.enable = rule.enable;
          } else {
            device.enable = true;
          }
        }
        return device;
      }),
    );

    await LocalStore.saveStoreData(savedData);

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
        name: userSaved ? userSaved.name : user.name,
        speed: userSaved ? userSaved.speed : 0,
        bytesDownloaded: userSaved ? userSaved.bytesDownloaded : 0,
        type: userSaved ? userSaved.type : 'unknown',
      };
    });

    await LocalStore.saveStoreData(withEnable);
    return withEnable;
  };
}
