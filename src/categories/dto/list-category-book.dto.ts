import { IsEnum, IsOptional } from 'class-validator';
import { ContentType } from 'generated/prisma/enums';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ListCategoryBooksDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType; // BOOK | COMIC
}
