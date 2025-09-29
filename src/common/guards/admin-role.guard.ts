import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Acceso restringido a administradores');
    }

    return true;
  }
}
