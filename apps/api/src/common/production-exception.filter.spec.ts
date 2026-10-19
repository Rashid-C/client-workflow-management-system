import { HttpException, Logger } from '@nestjs/common';
import { ProductionExceptionFilter } from './production-exception.filter.js';

describe('ProductionExceptionFilter', () => {
  it('returns a generic 500 body without exposing stack details', () => {
    const filter = new ProductionExceptionFilter();
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: '/api/v1/private' }),
        getResponse: () => response,
      }),
    } as never;
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    filter.catch(new Error('database secret'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 500, message: 'Internal server error' });
    vi.restoreAllMocks();
  });

  it('preserves the existing structured HttpException response', () => {
    const filter = new ProductionExceptionFilter();
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as never;
    const exception = new HttpException({ code: 'auth.forbidden', message: 'No access' }, 403);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ code: 'auth.forbidden', message: 'No access' });
  });

  it('preserves body parser client error status without exposing its stack', () => {
    const filter = new ProductionExceptionFilter();
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', originalUrl: '/api/v1/auth/login' }),
        getResponse: () => response,
      }),
    } as never;
    const error = Object.assign(new Error('request entity too large'), { status: 413 });

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith({ statusCode: 413, message: 'Payload Too Large' });
  });
});
