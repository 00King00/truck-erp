import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string | string[]) ?? exception.message;
        error = (resObj.error as string) ?? HttpStatus[statusCode];
      } else {
        message = res;
        error = HttpStatus[statusCode];
      }
    } else if (exception instanceof MongooseError.CastError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = `Invalid id: ${exception.value}`;
      error = 'Bad Request';
    } else if (
      exception instanceof MongoServerError &&
      exception.code === 11000
    ) {
      statusCode = HttpStatus.CONFLICT;
      const keyValue = (exception.keyValue ?? {}) as Record<string, unknown>;
      const field = Object.keys(keyValue)[0] ?? 'field';
      message = `Duplicate value for ${field}`;
      error = 'Conflict';
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      path: request.url,
    });
  }
}
