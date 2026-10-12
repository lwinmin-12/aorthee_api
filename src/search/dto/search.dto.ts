import { ApiProperty, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';
import { ListBooksDto } from '../../books/dto/book.dto';

export class SearchDto extends PickType(ListBooksDto, [
  'limit',
  'offset',
] as const) {
  @ApiProperty({
    example: 'magic library',
    maxLength: 200,
    description:
      'Full-text query: words, quoted phrases, OR, and minus-prefixed exclusions. Uses PostgreSQL simple tokenization without language stemming.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/[\p{L}\p{N}]/u)
  @MaxLength(200)
  q!: string;
}
