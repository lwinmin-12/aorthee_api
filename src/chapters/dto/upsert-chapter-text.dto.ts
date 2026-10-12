import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ContentFormat } from 'generated/prisma/enums';

export class UpsertChapterTextDto {
  @IsOptional()
  @IsEnum(ContentFormat)
  @ApiPropertyOptional({
    enum: ContentFormat,
    enumName: 'ContentFormat',
    default: 'MARKDOWN',
  })
  format?: ContentFormat; // defaults to MARKDOWN in the service

  @IsString()
  @MinLength(1)
  @ApiProperty({
    minLength: 1,
    example: '# Chapter 1\nThe story begins...',
    description:
      'Source text in the selected format; rich JSON is supplied as a string.',
  })
  content!: string; // Markdown source (or HTML / JSON-stringified rich doc)
}
