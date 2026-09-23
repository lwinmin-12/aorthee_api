import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateSocialLinkDto {
  @ApiProperty({ example: 'instagram', maxLength: 50 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(50)
  platform!: string;

  @ApiProperty({ example: 'https://instagram.com/reader', maxLength: 2048 })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 2147483647 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  order?: number;
}

export class UpdateSocialLinkDto extends PartialType(CreateSocialLinkDto, {
  skipNullProperties: false,
}) {}
