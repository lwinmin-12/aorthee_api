import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, Max, Min, ValidateIf } from 'class-validator';
import { ReadingMode, ReaderTheme } from '../../../generated/prisma/enums';

export class UpdateReaderSettingsDto {
  @ApiPropertyOptional({ enum: ReadingMode, enumName: 'ReadingMode' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ReadingMode)
  readingMode?: ReadingMode;

  @ApiPropertyOptional({ enum: ReaderTheme, enumName: 'ReaderTheme' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(ReaderTheme)
  readerTheme?: ReaderTheme;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 8,
    maximum: 72,
    example: 16,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(8)
  @Max(72)
  fontSize?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10, example: 0.5 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(10)
  letterSpacing?: number;
}

export class ReaderSettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: ReadingMode, enumName: 'ReadingMode', default: 'PAGE' })
  readingMode!: ReadingMode;

  @ApiProperty({ enum: ReaderTheme, enumName: 'ReaderTheme', default: 'LIGHT' })
  readerTheme!: ReaderTheme;

  @ApiProperty({ type: 'integer', default: 16 })
  fontSize!: number;

  @ApiProperty({ default: 0 })
  letterSpacing!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
