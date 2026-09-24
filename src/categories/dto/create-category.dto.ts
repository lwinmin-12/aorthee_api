import { IsInt, IsOptional, IsString, IsUrl, Length, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 50)
  name!: string;

  // Optional — service will slugify `name` if this is omitted.
  @IsOptional()
  @IsString()
  @Length(2, 60)
  slug?: string;

  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}