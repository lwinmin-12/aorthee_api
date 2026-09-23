import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { User } from '../../generated/prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { InterestDto, SaveInterestsDto, ThemeDto } from './dto/preferences.dto';
import { PreferencesService } from './preferences.service';

@ApiTags('Interests')
@Controller('interests')
export class InterestsController {
  constructor(private readonly preferences: PreferencesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all interest options in display order' })
  @ApiOkResponse({ type: [InterestDto] })
  list() {
    return this.preferences.listInterests();
  }
}

@ApiTags('User preferences')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Missing or invalid Firebase ID token.',
})
@ApiForbiddenResponse({ description: 'Account is suspended or deleted.' })
@Controller('users/me')
export class UserPreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Post('interests')
  @ApiOperation({
    summary: 'Add selected interests in bulk',
    description:
      'Existing selections are retained and duplicates are ignored. An empty list is a no-op. Returns all selected interests in display order.',
  })
  @ApiCreatedResponse({ type: [InterestDto] })
  @ApiBadRequestResponse({
    description: 'Invalid body or unknown interest IDs.',
  })
  saveInterests(@CurrentUser() user: User, @Body() dto: SaveInterestsDto) {
    return this.preferences.saveInterests(user.id, dto.interestIds);
  }

  @Get('interests')
  @ApiOperation({ summary: 'Get current user selected interests' })
  @ApiOkResponse({ type: [InterestDto] })
  getInterests(@CurrentUser() user: User) {
    return this.preferences.getInterests(user.id);
  }

  @Patch('theme')
  @ApiOperation({ summary: 'Update current user theme mode' })
  @ApiOkResponse({ type: ThemeDto })
  @ApiBadRequestResponse({
    description: 'Invalid theme mode or request fields.',
  })
  updateTheme(@CurrentUser() user: User, @Body() dto: ThemeDto) {
    return this.preferences.updateTheme(user.id, dto.themeMode);
  }
}
