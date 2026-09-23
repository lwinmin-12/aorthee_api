import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'generated/prisma/enums';

export const ROLES = 'auth:roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
