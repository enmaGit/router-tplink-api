import { Controller, Get } from '@nestjs/common';
import { DeviceService } from './services/DeviceService';

@Controller()
export class AppController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get('devices')
  async getDevices(): Promise<any> {
    const res = await this.deviceService.getDevices();
    return res;
  }
}
