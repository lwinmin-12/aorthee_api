import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { DevicePlatform } from '../../../generated/prisma/enums';
export class CreateSessionDto {
  @ApiProperty({
    example: 'device-123',
    maxLength: 255,
    description: 'Unique identifier for this device.',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  deviceId!: string;

  @ApiProperty({ enum: DevicePlatform, enumName: 'DevicePlatform' })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @ApiPropertyOptional({
    description: 'Firebase Cloud Messaging registration token.',
    maxLength: 4096,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  fcmToken?: string;
}
