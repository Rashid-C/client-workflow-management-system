
import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/health')
export class AppController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      service: 'tickwise-api',
    };
  }
}
