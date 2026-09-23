import { ApiProperty } from '@nestjs/swagger';
import {
  DevicePlatform,
  ThemeMode,
  UserRole,
} from '../../../generated/prisma/enums';
import { IsBoolean, IsEmail, IsEnum, IsString } from 'class-validator';

export class UserProfileDto {
  @ApiProperty({ enum: ThemeMode, enumName: 'ThemeMode' })
  themeMode!: ThemeMode;

  @ApiProperty({ type: String })
  @IsString()
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  @IsEmail()
  email!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @IsString()
  phone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @IsString()
  username!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @IsString()
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @IsString()
  avatarUrl!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @IsString()
  coverPhotoUrl!: string | null;

  @ApiProperty({ type: String, nullable: true })
  @IsString()
  bio!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @IsString()
  birthDate!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @IsString()
  ageVerifiedAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsString()
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsString()
  updatedAt!: string;

  @ApiProperty()
  @IsBoolean()
  isAgeVerified!: boolean;

  @ApiProperty()
  @IsBoolean()
  isMinor!: boolean;

  @ApiProperty()
  @IsBoolean()
  onboardingCompleted!: boolean;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;
}

export class SessionResponseDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  deviceId!: string;

  @ApiProperty({ enum: DevicePlatform, enumName: 'DevicePlatform' })
  @IsEnum(DevicePlatform, { message: 'Invalid device platform' })
  platform!: DevicePlatform;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsString()
  lastActiveAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @IsString()
  revokedAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsString()
  createdAt!: string;
}
