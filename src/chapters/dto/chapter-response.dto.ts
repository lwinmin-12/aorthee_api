import { ApiProperty } from '@nestjs/swagger';
import { ContentStatus, ContentFormat } from '../../../generated/prisma/enums';

export class ChapterResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: 'integer' })
  order!: number;

  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  status!: ContentStatus;

  @ApiProperty({ type: 'integer' })
  viewCount!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  releaseAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}

export class ChapterTextResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  chapterId!: string;

  @ApiProperty({ enum: ContentFormat, enumName: 'ContentFormat' })
  format!: ContentFormat;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: 'integer' })
  wordCount!: number;

  @ApiProperty({ type: 'integer' })
  estimatedReadMinutes!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class ChapterPageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  chapterId!: string;

  @ApiProperty({ type: 'integer' })
  order!: number;

  @ApiProperty()
  imageUrl!: string;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ type: 'integer' })
  width!: number;

  @ApiProperty({ type: 'integer' })
  height!: number;

  @ApiProperty({ type: 'integer', nullable: true })
  fileSizeBytes!: number | null;

  @ApiProperty({ type: String, nullable: true })
  blurhash!: string | null;
}

export class ChapterWithContentDto extends ChapterResponseDto {
  @ApiProperty({ type: ChapterTextResponseDto, nullable: true })
  text!: ChapterTextResponseDto | null;
  @ApiProperty({ type: [ChapterPageResponseDto] })
  pages!: ChapterPageResponseDto[];
}

export class TextContentResponseDto {
  @ApiProperty({ enum: ['text'] })
  type!: 'text';

  @ApiProperty({ type: ChapterWithContentDto })
  chapter!: ChapterWithContentDto;

  @ApiProperty({ type: ChapterTextResponseDto, nullable: true })
  text!: ChapterTextResponseDto | null;
}

export class PagesContentResponseDto {
  @ApiProperty({ enum: ['pages'] })
  type!: 'pages';

  @ApiProperty({ type: ChapterWithContentDto })
  chapter!: ChapterWithContentDto;

  @ApiProperty({ type: [ChapterPageResponseDto] })
  pages!: ChapterPageResponseDto[];
}
