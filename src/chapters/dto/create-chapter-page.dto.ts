import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateChapterPageDto {
  @IsUrl()
  @ApiProperty({ format: 'uri', example: 'https://example.com/page-1.jpg' })
  imageUrl!: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ format: 'uri' })
  thumbnailUrl?: string;

  @IsInt()
  @Min(1)
  @ApiProperty({ minimum: 1, example: 1200 })
  width!: number;

  @IsInt()
  @Min(1)
  @ApiProperty({ minimum: 1, example: 1800 })
  height!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0 })
  fileSizeBytes?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  blurhash?: string;

  // If omitted, service appends it after the current last page.
  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    minimum: 1,
    description: 'Appended after the last page when omitted.',
  })
  order?: number;
}
