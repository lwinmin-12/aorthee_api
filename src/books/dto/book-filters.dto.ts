import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { AgeRating, ContentType } from '../../../generated/prisma/enums';

export class BookFiltersDto {
  @ApiPropertyOptional({ enum: ContentType, enumName: 'ContentType' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({
    description: 'Category ID or slug.',
    example: 'fantasy',
    maxLength: 200,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  category?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'Comma-separated tags; matches any listed tag (case-sensitive).',
    example: 'fantasy,adventure',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.split(',').map((tag) => tag.trim())
      : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: AgeRating, enumName: 'AgeRating' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(AgeRating)
  ageRating?: AgeRating;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Exact language code (case-insensitive).',
    maxLength: 35,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/)
  @MaxLength(35)
  language?: string;
}
