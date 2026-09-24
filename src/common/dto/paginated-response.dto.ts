import { PaginationMetaDto } from './pagination-meta.dto';

export type PaginatedResponseDto<T> = {
  meta: PaginationMetaDto;
  data: T[];
};
