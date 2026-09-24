import { PartialType } from '@nestjs/swagger';
import { CreateBooksCategoryDto } from './assign-category.dto';

export class UpdateBooksCategoryDto extends PartialType(
  CreateBooksCategoryDto,
) {}
