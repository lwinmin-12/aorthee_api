import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_AUTH = 'auth:optional';
// Anonymous requests are accepted; supplied credentials are still verified.
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH, true);
