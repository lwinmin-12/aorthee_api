import { ApiProperty } from '@nestjs/swagger';
import { BookResponseDto } from '../../books/dto/book-response.dto';

export class CategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  iconUrl!: string | null;

  @ApiProperty({ type: 'integer' })
  order!: number;
}

export class CategoryBooksResponseDto {
  @ApiProperty({ type: CategoryResponseDto })
  category!: CategoryResponseDto;

  @ApiProperty({ type: [BookResponseDto] })
  items!: BookResponseDto[];

  @ApiProperty({ type: 'integer' })
  page!: number;

  @ApiProperty({ type: 'integer' })
  limit!: number;

  @ApiProperty({ type: 'integer' })
  total!: number;

  @ApiProperty({ type: 'integer' })
  totalPages!: number;
}
