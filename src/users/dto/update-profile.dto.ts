import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    pattern: '^[A-Za-z0-9_]{3,30}$',
    description: 'Unique, case-sensitive username. Null clears it.',
  })
  @IsOptional()
  @Matches(/^[A-Za-z0-9_]{3,30}$/)
  username?: string | null;
}

export class UpdateCoverPhotoDto {
  @ApiProperty({ type: String, nullable: true, maxLength: 2048 })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  // Null explicitly clears the photo; omission is not a valid request.
  @ValidateIf((_object, value: unknown) => value !== null)
  coverPhotoUrl!: string | null;
}
