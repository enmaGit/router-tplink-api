import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import Device from './entities/Device';
import { DeviceService } from './services/DeviceService';

@Controller('devices')
export class AppController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  async getDevices(): Promise<any> {
    const res = await this.deviceService.getDevices();
    return res;
  }

  @Put(':id')
  async changeSetup(@Param() params, @Body() newDeviceSetup: Device): Promise<any> {
    const res = await this.deviceService.changeSetup(params.id, newDeviceSetup);
    return res;
  }
}
