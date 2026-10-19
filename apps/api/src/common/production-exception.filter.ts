import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ProductionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProductionExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (exception instanceof HttpException) {
      if (exception.getStatus() >= 500) {
        const context = host.switchToHttp();
        const request = context.getRequest<Request>();
        this.logger.error(`${request.method} ${request.originalUrl}: ${exception.message}`);
        context.getResponse<Response>().status(500).json({ statusCode: 500, message: 'Internal server error' });
        return;
      }
      const response = host.switchToHttp().getResponse<Response>();
      const body = exception.getResponse();
      const safeBody = typeof body === 'object' && body !== null
        ? Object.fromEntries(Object.entries(body).filter(([key]) => !['stack', 'stackTrace', 'trace'].includes(key)))
        : body;
      response.status(exception.getStatus()).json(safeBody);
      return;
    }

    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const error = exception instanceof Error ? exception : new Error('Unknown server error');
    const status = (exception as { status?: unknown } | null)?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      response.status(status).json({
        statusCode: status,
        message: status === 413 ? 'Payload Too Large' : 'Bad Request',
      });
      return;
    }
    this.logger.error(`${request.method} ${request.originalUrl}: ${error.message}`, error.stack);
    response.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}
