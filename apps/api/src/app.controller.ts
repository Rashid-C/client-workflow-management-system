
import { Controller, Get, Version } from '@nestjs/common';
import { Public } from './auth/decorators.js';

@Controller('health')
export class AppController {
  @Version('1')
  @Public()
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      service: 'tickwise-api',
    };
  }
}
