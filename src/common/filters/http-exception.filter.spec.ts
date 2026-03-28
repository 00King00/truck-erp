import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { HttpExceptionFilter } from './http-exception.filter';

const makeHost = (): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('handles HttpException with object response', () => {
    const { host, status, json } = makeHost();
    const exception = new HttpException(
      { message: 'Not found', error: 'Not Found' },
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Not found' }),
    );
  });

  it('handles HttpException with string response', () => {
    const { host, status, json } = makeHost();
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Forbidden' }),
    );
  });

  it('handles Mongoose CastError as 400', () => {
    const { host, status, json } = makeHost();
    const castError = new MongooseError.CastError('ObjectId', 'bad-id', 'id');

    filter.catch(castError, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, error: 'Bad Request' }),
    );
  });

  it('handles Mongoose ValidationError as 422', () => {
    const { host, status, json } = makeHost();
    const validationError = new MongooseError.ValidationError();
    validationError.errors = {
      code: new MongooseError.ValidatorError({
        message: 'Path `code` is required.',
        path: 'code',
        value: undefined,
      }),
    };

    filter.catch(validationError, host);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        error: 'Validation Error',
        message: expect.arrayContaining(['Path `code` is required.']),
      }),
    );
  });

  it('handles MongoServerError 11000 as 409', () => {
    const { host, status, json } = makeHost();
    const dupError = new MongoServerError({ code: 11000 });
    dupError.keyValue = { code: 'TRK001' };

    filter.catch(dupError, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: 'Conflict' }),
    );
  });

  it('handles unknown errors as 500', () => {
    const { host, status, json } = makeHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  it('includes path in all responses', () => {
    const { host, json } = makeHost();
    filter.catch(new Error('boom'), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/test' }),
    );
  });
});
