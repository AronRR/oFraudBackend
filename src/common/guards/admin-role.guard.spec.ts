import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';

const createContext = (user: unknown): ExecutionContext => ({
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

describe('AdminRoleGuard', () => {
  let guard: AdminRoleGuard;

  beforeEach(() => {
    guard = new AdminRoleGuard();
  });

  it('permite el acceso cuando el usuario es admin', () => {
    const context = createContext({ role: 'admin' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('lanza ForbiddenException cuando el usuario no es admin', () => {
    const context = createContext({ role: 'user' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException cuando no hay usuario en la petición', () => {
    const context = createContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
