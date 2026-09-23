import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ThemeMode } from '../../../generated/prisma/enums';

export class SaveInterestsDto {
  @ApiProperty({ type: [String], example: ['interest-1', 'interest-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  interestIds!: string[];
}

export class ThemeDto {
  @ApiProperty({ enum: ThemeMode, enumName: 'ThemeMode' })
  @IsEnum(ThemeMode)
  themeMode!: ThemeMode;
}

export class InterestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  iconUrl!: string | null;

  @ApiProperty()
  order!: number;
}
