import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, NotFoundError } from '../domain/errors';

/**
 * Traduce los errores del dominio a HTTP: el dominio no conoce HTTP,
 * la frontera sí. DomainError → 400, NotFoundError → 404.
 */
@Catch(DomainError, NotFoundError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError | NotFoundError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof NotFoundError ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
