import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAdminService } from '../../firebase-admin/firebase-admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from '../authenticated-request';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebase: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const match =
      typeof header === 'string' ? /^Bearer ([^\s]+)$/i.exec(header) : null;
    if (!match)
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'A Bearer token is required',
        code: 'UNAUTHORIZED',
      });
    const identity = await this.firebase.verifyIdToken(match[1]);
    const user = await this.prisma.user.upsert({
      where: { firebaseUid: identity.uid },
      create: {
        firebaseUid: identity.uid,
        authProvider: identity.provider,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl,
      },
      update: {},
    });
    if (user.status !== 'ACTIVE' || user.deletedAt) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Account is not active',
        code:
          user.status === 'SUSPENDED' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_DELETED',
      });
    }
    request.user = user;
    return true;
  }
}
