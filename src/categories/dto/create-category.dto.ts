import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 50)
  @ApiProperty({ example: 'Fantasy', minLength: 2, maxLength: 50 })
  name!: string;

  // Optional — service will slugify `name` if this is omitted.
  @IsOptional()
  @IsString()
  @Length(2, 60)
  @ApiPropertyOptional({
    example: 'fantasy',
    minLength: 2,
    maxLength: 60,
    description: 'Generated from name if omitted.',
  })
  slug?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({
    example: 'https://example.com/fantasy.png',
    format: 'uri',
  })
  iconUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  order?: number;
}
