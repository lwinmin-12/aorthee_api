import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import { UserProfileDto, SessionResponseDto } from './dto/auth-response.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { AuthService, userProfile } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreateSessionDto } from './dto/create-session.dto';
import { VerifyAgeDto } from './dto/verify-age.dto';
import type { User } from 'generated/prisma/client';

@ApiTags('Authentication')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing, invalid, expired, or revoked Firebase ID token.',
})
@ApiForbiddenResponse({ description: 'Account is suspended or deleted.' })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiOkResponse({ type: UserProfileDto })
  @Get('me')
  me(@CurrentUser() user: User) {
    return userProfile(user);
  }

  @ApiOperation({ summary: 'Verify the user meets the minimum age of 12' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiBadRequestResponse({
    description: 'Invalid or future birth date, or unexpected request fields.',
  })
  @ApiForbiddenResponse({
    description:
      'User is under 12 (AGE_REQUIREMENT_NOT_MET), or the account is inactive.',
  })
  @Post('verify-age')
  @HttpCode(200)
  verifyAge(@CurrentUser() user: User, @Body() dto: VerifyAgeDto) {
    return this.auth.verifyAge(user.id, dto.birthDate);
  }

  @ApiOperation({ summary: 'Create or reactivate a device session' })
  @ApiCreatedResponse({ type: SessionResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid device ID, platform, FCM token, or unexpected request fields.',
  })
  @Post('sessions')
  createSession(@CurrentUser() user: User, @Body() dto: CreateSessionDto) {
    return this.auth.createSession(user.id, dto);
  }

  @ApiOperation({ summary: 'Revoke the current user’s device session' })
  @ApiParam({ name: 'deviceId', example: 'device-123' })
  @ApiNoContentResponse({
    description:
      'Session revoked; also succeeds if no matching active session exists.',
  })
  @Delete('sessions/:deviceId')
  @HttpCode(204)
  revokeSession(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
  ) {
    return this.auth.revokeSession(user.id, deviceId);
  }

  @ApiOperation({ summary: 'Revoke Firebase tokens and all device sessions' })
  @ApiNoContentResponse({
    description: 'All sessions and Firebase refresh tokens revoked.',
  })
  @Post('logout-all')
  @HttpCode(204)
  logoutAll(@CurrentUser() user: User) {
    return this.auth.logoutAll(user);
  }

}
