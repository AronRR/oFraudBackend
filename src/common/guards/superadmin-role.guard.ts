import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request';

@Injectable()
export class SuperAdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || user.role !== 'superadmin') {
      throw new ForbiddenException('Acceso restringido a super administradores');
    }

    return true;
  }
}
