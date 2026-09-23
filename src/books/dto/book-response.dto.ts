import { ApiProperty } from '@nestjs/swagger';
import {
  AgeRating,
  ContentStatus,
  ContentType,
} from '../../../generated/prisma/enums';

export class BookResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: String, nullable: true })
  synopsis!: string | null;

  @ApiProperty({ type: String, nullable: true })
  coverImageUrl!: string | null;

  @ApiProperty({ enum: ContentType, enumName: 'ContentType' })
  type!: ContentType;

  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  status!: ContentStatus;

  @ApiProperty({ enum: AgeRating, enumName: 'AgeRating' })
  ageRating!: AgeRating;

  @ApiProperty()
  language!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  authorId!: string;

  @ApiProperty()
  viewCount!: number;

  @ApiProperty()
  favoriteCount!: number;

  @ApiProperty()
  chapterCount!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
