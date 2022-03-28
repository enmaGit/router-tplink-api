import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceService } from 'src/services/DeviceService';
import localStore from 'src/utils/localStore';

@Injectable()
export class UpdateSpeedService {
  constructor(private readonly deviceService: DeviceService) {}

  updateSpeeds = async () => {
    const statistics = await this.deviceService.getCurrentStatistics();
    const devices = await this.deviceService.getDevices();
    const withSpeeds = devices.map((device) => {
      const stats = statistics.find((stat) => stat.mac === device.mac);
      if (stats) {
        if (device.bytesDownloaded && device.bytesDownloaded > 0) {
          device.speed = ((stats.bytes - device.bytesDownloaded) / 10) * 8;
        } else {
          device.speed = 0;
        }
        device.bytesDownloaded = stats.bytes || device.bytesDownloaded || 0;
        return device;
      } else {
        device.speed = 0;
        return device;
      }
    });
    await localStore.saveStoreData(withSpeeds);
  };

  @Cron(CronExpression.EVERY_10_SECONDS)
  handleCron() {
    this.updateSpeeds();
  }
}
