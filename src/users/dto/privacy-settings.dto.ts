import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, ValidateIf } from 'class-validator';
import { ProfileVisibility } from '../../../generated/prisma/enums';

export class UpdatePrivacySettingsDto {
  @ApiPropertyOptional({
    enum: ProfileVisibility,
    enumName: 'ProfileVisibility',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  showReadingActivity?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  showLibrary?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  allowFollow?: boolean;
}
