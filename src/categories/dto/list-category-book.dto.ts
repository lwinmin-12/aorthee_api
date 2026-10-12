import { IntersectionType, OmitType } from '@nestjs/swagger';
import { BookFiltersDto } from '../../books/dto/book-filters.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListCategoryBooksDto extends IntersectionType(
  PaginationQueryDto,
  OmitType(BookFiltersDto, ['category'] as const),
) {}
