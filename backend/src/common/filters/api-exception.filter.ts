import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiResponse } from '../../../../shared/api-contracts';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? this.extractMessage(exception)
      : '服务器开小差了，请稍后再试';

    if (!isHttpException) {
      this.logger.error('Unhandled exception', exception as Error);
    }

    const payload: ApiResponse<null> = {
      code: status,
      message,
      data: null,
    };

    response.status(status).json(payload);
  }

  private extractMessage(exception: HttpException) {
    const body = exception.getResponse();
    if (typeof body === 'string') {
      return body;
    }
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      body.message
    ) {
      const value = (body as { message: unknown }).message;
      if (Array.isArray(value)) {
        return value.join('; ');
      }
      if (typeof value === 'string') {
        return value;
      }
    }
    return exception.message;
  }
}
