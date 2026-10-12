import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListBooksDto } from '../../books/dto/book.dto';
import { BookResponseDto } from '../../books/dto/book-response.dto';

export class LibraryQueryDto extends PickType(ListBooksDto, [
  'limit',
  'offset',
] as const) {}

export class UpsertReadingProgressDto {
  @ApiProperty({ example: 'book-1' })
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  bookId!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Chapter in this book. Null clears the chapter. Changing chapter resets omitted page/scroll positions.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  chapterId?: string | null;

  @ApiProperty({ minimum: 0, maximum: 100, example: 25.5 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  progressPercent!: number;

  @ApiPropertyOptional({
    type: 'integer',
    nullable: true,
    minimum: 0,
    maximum: 2147483647,
    description: 'Zero-based page index. Null clears the position.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(0)
  @Max(2147483647)
  lastPageIndex?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    description: 'Nonnegative scroll offset. Null clears the position.',
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  scrollOffset?: number | null;
}

export class FavoriteResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  bookId!: string;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class ReadingProgressResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  bookId!: string;
  @ApiProperty({ type: String, nullable: true })
  chapterId!: string | null;
  @ApiProperty({ minimum: 0, maximum: 100 })
  progressPercent!: number;
  @ApiProperty({ type: 'integer', nullable: true })
  lastPageIndex!: number | null;
  @ApiProperty({ type: Number, nullable: true })
  scrollOffset!: number | null;
  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class ContinueReadingResponseDto extends ReadingProgressResponseDto {
  @ApiProperty({ type: BookResponseDto })
  book!: BookResponseDto;
}
