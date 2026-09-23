import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { AgeRating, ContentType } from '../../../generated/prisma/enums';

export class CreateBookDto {
  @ApiProperty({ example: 'the-last-library', maxLength: 200 })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(200)
  slug!: string;

  @ApiProperty({ example: 'The Last Library', maxLength: 200 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: ContentType, enumName: 'ContentType' })
  @IsEnum(ContentType)
  type!: ContentType;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 10000 })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @MaxLength(10000)
  synopsis?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2048 })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  coverImageUrl?: string | null;

  @ApiPropertyOptional({
    enum: AgeRating,
    enumName: 'AgeRating',
    default: 'ALL',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(AgeRating)
  ageRating?: AgeRating;

  @ApiPropertyOptional({ default: 'en', maxLength: 35, example: 'en' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/)
  @MaxLength(35)
  language?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 20, default: [] })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}

// Changing content type could invalidate existing chapter text/page content.
export class UpdateBookDto extends PartialType(
  OmitType(CreateBookDto, ['type'] as const),
  { skipNullProperties: false },
) {}

export class ListBooksDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 2147483647 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  offset: number = 0;

  @ApiPropertyOptional({ enum: ContentType, enumName: 'ContentType' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ContentType)
  type?: ContentType;
}
