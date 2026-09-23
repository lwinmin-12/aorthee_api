import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator';
import { UserProfileDto } from '../auth/dto/auth-response.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import {
  CreateSocialLinkDto,
  UpdateSocialLinkDto,
} from './dto/social-link.dto';
import {
  UpdateCoverPhotoDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';
import {
  FollowResponseDto,
  PrivacySettingsResponseDto,
  PublicProfileDto,
  SocialLinkResponseDto,
} from './dto/users-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing or invalid Firebase ID token.',
})
@ApiForbiddenResponse({ description: 'Account is suspended or deleted.' })
@ApiBadRequestResponse({ description: 'Invalid body or unexpected fields.' })
@Controller('users/me')
export class CurrentUserController {
  constructor(private readonly users: UsersService) {}

  @Patch()
  @ApiOperation({ summary: 'Update your profile' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiConflictResponse({ description: 'Username is already in use.' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Patch('cover-photo')
  @ApiOperation({ summary: 'Update or clear your cover photo' })
  @ApiOkResponse({ type: UserProfileDto })
  updateCoverPhoto(
    @CurrentUser() user: User,
    @Body() dto: UpdateCoverPhotoDto,
  ) {
    return this.users.updateProfile(user.id, dto);
  }

  @Post('social-links')
  @ApiOperation({ summary: 'Add a social link' })
  @ApiCreatedResponse({ type: SocialLinkResponseDto })
  addSocialLink(@CurrentUser() user: User, @Body() dto: CreateSocialLinkDto) {
    return this.users.addSocialLink(user.id, dto);
  }

  @Patch('social-links/:id')
  @ApiOperation({ summary: 'Edit one of your social links' })
  @ApiOkResponse({ type: SocialLinkResponseDto })
  @ApiNotFoundResponse({
    description: 'Social link does not exist or belongs to another user.',
  })
  updateSocialLink(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateSocialLinkDto,
  ) {
    return this.users.updateSocialLink(user.id, id, dto);
  }

  @Delete('social-links/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove one of your social links' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({
    description: 'Social link does not exist or belongs to another user.',
  })
  deleteSocialLink(@CurrentUser() user: User, @Param('id') id: string) {
    return this.users.deleteSocialLink(user.id, id);
  }

  @Get('privacy-settings')
  @ApiOperation({
    summary: 'Get your privacy settings, creating schema defaults if absent',
  })
  @ApiOkResponse({ type: PrivacySettingsResponseDto })
  getPrivacySettings(@CurrentUser() user: User) {
    return this.users.getPrivacySettings(user.id);
  }

  @Patch('privacy-settings')
  @ApiOperation({ summary: 'Update your privacy settings' })
  @ApiOkResponse({ type: PrivacySettingsResponseDto })
  updatePrivacySettings(
    @CurrentUser() user: User,
    @Body() dto: UpdatePrivacySettingsDto,
  ) {
    return this.users.updatePrivacySettings(user.id, dto);
  }
}

@ApiTags('Users')
@ApiNotFoundResponse({
  description:
    'User does not exist, is inactive, or is not visible to the viewer.',
})
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @OptionalAuth()
  @Get('username/:username')
  @ApiOperation({
    summary: 'Get a profile by case-sensitive username',
    security: [{}, { bearer: [] }],
  })
  @ApiOkResponse({ type: PublicProfileDto })
  getByUsername(
    @Param('username') username: string,
    @CurrentUser() viewer?: User,
  ) {
    return this.users.getProfile({ username }, viewer?.id);
  }

  @OptionalAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Get a profile by ID',
    security: [{}, { bearer: [] }],
  })
  @ApiOkResponse({ type: PublicProfileDto })
  getById(@Param('id') id: string, @CurrentUser() viewer?: User) {
    return this.users.getProfile({ id }, viewer?.id);
  }

  @OptionalAuth()
  @Get(':id/social-links')
  @ApiOperation({
    summary: 'List a visible user’s social links',
    security: [{}, { bearer: [] }],
  })
  @ApiOkResponse({ type: [SocialLinkResponseDto] })
  listSocialLinks(@Param('id') id: string, @CurrentUser() viewer?: User) {
    return this.users.listSocialLinks(id, viewer?.id);
  }

  @Post(':id/follow')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Follow a user; repeated requests return the existing follow',
  })
  @ApiCreatedResponse({ type: FollowResponseDto })
  @ApiBadRequestResponse({ description: 'Cannot follow yourself.' })
  @ApiForbiddenResponse({
    description: 'Target disallows follows, or your account is inactive.',
  })
  @ApiUnauthorizedResponse()
  follow(@CurrentUser() user: User, @Param('id') id: string) {
    return this.users.follow(user.id, id);
  }

  @Delete(':id/follow')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user; succeeds if no follow exists' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse()
  unfollow(@CurrentUser() user: User, @Param('id') id: string) {
    return this.users.unfollow(user.id, id);
  }

  @OptionalAuth()
  @Get(':id/followers')
  @ApiOperation({
    summary: 'List visible follower profiles',
    security: [{}, { bearer: [] }],
  })
  @ApiOkResponse({ type: [PublicProfileDto] })
  @ApiBadRequestResponse({ description: 'Invalid pagination.' })
  followers(
    @Param('id') id: string,
    @Query() query: ListUsersDto,
    @CurrentUser() viewer?: User,
  ) {
    return this.users.listConnections(id, 'followers', query, viewer?.id);
  }

  @OptionalAuth()
  @Get(':id/following')
  @ApiOperation({
    summary: 'List visible profiles this user follows',
    security: [{}, { bearer: [] }],
  })
  @ApiOkResponse({ type: [PublicProfileDto] })
  @ApiBadRequestResponse({ description: 'Invalid pagination.' })
  following(
    @Param('id') id: string,
    @Query() query: ListUsersDto,
    @CurrentUser() viewer?: User,
  ) {
    return this.users.listConnections(id, 'following', query, viewer?.id);
  }
}
