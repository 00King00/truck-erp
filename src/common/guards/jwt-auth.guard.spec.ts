import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

const makeContext = (authHeader?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: authHeader },
      }),
    }),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = { verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
    guard = new JwtAuthGuard(jwtService);
  });

  it('returns true and attaches payload for valid token', () => {
    const payload = { sub: '1', role: 'admin' };
    jwtService.verify.mockReturnValue(payload);

    const ctx = makeContext('Bearer valid.token.here');
    expect(guard.canActivate(ctx)).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('valid.token.here');
  });

  it('throws UnauthorizedException when Authorization header is missing', () => {
    const ctx = makeContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when scheme is not Bearer', () => {
    const ctx = makeContext('Basic sometoken');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is invalid', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const ctx = makeContext('Bearer bad.token');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
