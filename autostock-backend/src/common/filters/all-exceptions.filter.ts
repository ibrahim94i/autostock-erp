import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ValidationError } from '../../events/event-core.service';

const TRANSIENT_PRISMA_CODES = new Set([
  'P1001',
  'P1002',
  'P1008',
  'P1017',
  'P2034',
]);

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();
    const path = request.url;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message = this.extractMessage(exceptionResponse);
      const error = this.extractErrorName(exceptionResponse, status);

      this.logException('warn', exception, status, path);

      response.status(status).json({
        statusCode: status,
        error,
        message,
        timestamp,
        path,
      });
      return;
    }

    if (exception instanceof ValidationError) {
      this.logException('warn', exception, HttpStatus.UNPROCESSABLE_ENTITY, path);

      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'Unprocessable Entity',
        message: exception.reason,
        timestamp,
        path,
      });
      return;
    }

    if (this.isTransientDatabaseError(exception)) {
      this.logException('error', exception, HttpStatus.SERVICE_UNAVAILABLE, path);

      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message: 'مؤقت، أعد المحاولة',
        timestamp,
        path,
      });
      return;
    }

    if (this.isBusinessValidationError(exception)) {
      const message =
        exception instanceof Error ? exception.message : 'Validation failed';

      this.logException('warn', exception, HttpStatus.UNPROCESSABLE_ENTITY, path);

      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'Unprocessable Entity',
        message,
        timestamp,
        path,
      });
      return;
    }

    this.logException('error', exception, HttpStatus.INTERNAL_SERVER_ERROR, path);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp,
      path,
    });
  }

  private extractMessage(response: string | object): string | string[] {
    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const obj = response as Record<string, unknown>;
      if (Array.isArray(obj.message)) {
        return obj.message.map(String);
      }
      if (typeof obj.message === 'string') {
        return obj.message;
      }
    }

    return 'An error occurred';
  }

  private extractErrorName(response: string | object, status: number): string {
    if (typeof response === 'object' && response !== null) {
      const obj = response as Record<string, unknown>;
      if (typeof obj.error === 'string') {
        return obj.error;
      }
    }

    return this.httpStatusToError(status);
  }

  private httpStatusToError(status: number): string {
    const name = HttpStatus[status];
    if (typeof name === 'string') {
      return name
        .split('_')
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ');
    }

    return 'Error';
  }

  private isTransientDatabaseError(exception: unknown): boolean {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return TRANSIENT_PRISMA_CODES.has(exception.code);
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      return true;
    }

    if (exception instanceof Error) {
      const msg = exception.message.toLowerCase();
      return (
        msg.includes('deadlock') ||
        msg.includes('serialization failure') ||
        msg.includes('could not connect') ||
        msg.includes('connection terminated') ||
        msg.includes('connection refused')
      );
    }

    return false;
  }

  private isBusinessValidationError(exception: unknown): boolean {
    if (!(exception instanceof Error)) {
      return false;
    }

    const msg = exception.message.toLowerCase();
    return (
      msg.includes('insufficient stock') ||
      msg.includes('exceeds sold') ||
      msg.includes('validation failed') ||
      msg.includes('not found on this invoice') ||
      msg.includes('already received')
    );
  }

  private logException(
    level: 'warn' | 'error',
    exception: unknown,
    status: number,
    path: string,
  ): void {
    const stack = exception instanceof Error ? exception.stack : String(exception);
    const message = exception instanceof Error ? exception.message : String(exception);

    if (level === 'error') {
      this.logger.error(`[${status}] ${path} — ${message}`, stack);
      return;
    }

    this.logger.warn(`[${status}] ${path} — ${message}`, stack);
  }
}
