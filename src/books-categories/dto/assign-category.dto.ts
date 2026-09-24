import { IsString } from 'class-validator';

export class AssignCategoryDto {
  @IsString()
  categoryId!: string;
}
