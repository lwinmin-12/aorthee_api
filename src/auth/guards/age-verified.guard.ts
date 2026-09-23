import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../authenticated-request';
@Injectable()
export class AgeVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user?.isAgeVerified)
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Age verification required',
        code: 'AGE_VERIFICATION_REQUIRED',
      });
    return true;
  }
}
