import { ForbiddenException } from '@nestjs/common';
import { User } from 'generated/prisma/browser';
export function assertOwnerOrAdmin(
  user: Pick<User, 'id' | 'role'>,
  resource: { authorId: string },
): void {
  if (user.role !== 'ADMIN' && resource.authorId !== user.id)
    throw new ForbiddenException(
      'Only the owner or an administrator may modify this resource',
    );
}
