import type { Request } from 'express';
import { User } from 'generated/prisma/browser';
export interface AuthenticatedRequest extends Request {
  user: User;
}
