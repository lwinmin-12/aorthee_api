import { ApiProperty } from '@nestjs/swagger';
import { ProfileVisibility } from '../../../generated/prisma/enums';

export class PublicProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  username!: string | null;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ type: String, nullable: true })
  coverPhotoUrl!: string | null;

  @ApiProperty({ type: String, nullable: true })
  bio!: string | null;
}

export class SocialLinkResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  platform!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  order!: number;
}

export class FollowResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  followerId!: string;

  @ApiProperty()
  followingId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}

export class PrivacySettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: ProfileVisibility, enumName: 'ProfileVisibility' })
  profileVisibility!: ProfileVisibility;

  @ApiProperty()
  showReadingActivity!: boolean;

  @ApiProperty()
  showLibrary!: boolean;

  @ApiProperty()
  allowFollow!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
