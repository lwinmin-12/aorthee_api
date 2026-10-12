import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class AssignCategoryDto {
  @ApiPropertyOptional({
    example: 'category-1',
    description:
      'Single category ID. Provide either categoryId or categoryIds.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  @MaxLength(200)
  categoryId?: string;

  @ApiPropertyOptional({
    type: [String],
    minItems: 1,
    maxItems: 100,
    example: ['category-1', 'category-2'],
    description:
      'Category IDs to add in bulk. Existing assignments are retained.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(200, { each: true })
  categoryIds?: string[];
}
