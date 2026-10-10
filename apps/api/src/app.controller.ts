
import { Controller, Get, Version } from '@nestjs/common';

@Controller('health')
export class AppController {
  @Version('1')
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      service: 'tickwise-api',
    };
  }
}
