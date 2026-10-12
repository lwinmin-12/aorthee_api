import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateChapterDto {
  @IsString()
  @Length(1, 150)
  @ApiProperty({ example: 'Chapter 1', minLength: 1, maxLength: 150 })
  title!: string;

  // If omitted, service places it after the current last chapter in the book.
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    minimum: 1,
    description: 'Appended after the last chapter when omitted.',
  })
  order?: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-10-10T00:00:00Z',
  })
  releaseAt?: string;
}
