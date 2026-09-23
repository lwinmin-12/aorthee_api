import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { userProfile } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import {
  CreateSocialLinkDto,
  UpdateSocialLinkDto,
} from './dto/social-link.dto';
import {
  UpdateCoverPhotoDto,
  UpdateProfileDto,
} from './dto/update-profile.dto';

const publicProfileSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  coverPhotoUrl: true,
  bio: true,
} satisfies Prisma.UserSelect;

const socialLinkSelect = {
  id: true,
  platform: true,
  url: true,
  order: true,
} satisfies Prisma.SocialLinkSelect;

// Missing settings use the schema's PUBLIC default. Keep this filter on list
// members as well as the requested profile so lists cannot bypass visibility.
function visibleUsers(viewerId?: string): Prisma.UserWhereInput {
  const visibility: Prisma.UserWhereInput[] = [
    { privacySetting: { is: null } },
    { privacySetting: { is: { profileVisibility: 'PUBLIC' } } },
  ];
  if (viewerId) {
    visibility.push(
      { id: viewerId },
      {
        privacySetting: { is: { profileVisibility: 'FOLLOWERS_ONLY' } },
        followers: { some: { followerId: viewerId } },
      },
    );
  }
  return { status: 'ACTIVE', deletedAt: null, OR: visibility };
}

function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(
    where: { id: string } | { username: string },
    viewerId?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { ...where, ...visibleUsers(viewerId) },
      select: publicProfileSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto | UpdateCoverPhotoDto,
  ) {
    try {
      return userProfile(
        await this.prisma.user.update({
          where: { id: userId },
          data: dto,
        }),
      );
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Username is already in use');
      }
      if (isPrismaError(error, 'P2025'))
        throw new NotFoundException('User not found');
      throw error;
    }
  }

  addSocialLink(userId: string, dto: CreateSocialLinkDto) {
    return this.prisma.socialLink.create({
      data: { ...dto, userId },
      select: socialLinkSelect,
    });
  }

  async updateSocialLink(userId: string, id: string, dto: UpdateSocialLinkDto) {
    try {
      return await this.prisma.socialLink.update({
        where: { id, userId },
        data: dto,
        select: socialLinkSelect,
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025'))
        throw new NotFoundException('Social link not found');
      throw error;
    }
  }

  async deleteSocialLink(userId: string, id: string) {
    const result = await this.prisma.socialLink.deleteMany({
      where: { id, userId },
    });
    if (!result.count) throw new NotFoundException('Social link not found');
  }

  async listSocialLinks(userId: string, viewerId?: string) {
    await this.getProfile({ id: userId }, viewerId);
    return this.prisma.socialLink.findMany({
      where: { userId },
      select: socialLinkSelect,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId)
      throw new BadRequestException('Cannot follow yourself');
    const target = await this.prisma.user.findFirst({
      where: { id: followingId, status: 'ACTIVE', deletedAt: null },
      select: { privacySetting: { select: { allowFollow: true } } },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.privacySetting?.allowFollow === false) {
      throw new ForbiddenException('This user does not allow follows');
    }
    try {
      return await this.prisma.follow.upsert({
        where: { followerId_followingId: { followerId, followingId } },
        create: { followerId, followingId },
        update: {},
      });
    } catch (error) {
      // Concurrent first-time requests may race on the compound unique key.
      if (isPrismaError(error, 'P2002')) {
        return this.prisma.follow.findUniqueOrThrow({
          where: { followerId_followingId: { followerId, followingId } },
        });
      }
      if (isPrismaError(error, 'P2003'))
        throw new NotFoundException('User not found');
      throw error;
    }
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({ where: { followerId, followingId } });
  }

  async listConnections(
    userId: string,
    direction: 'followers' | 'following',
    query: ListUsersDto,
    viewerId?: string,
  ) {
    await this.getProfile({ id: userId }, viewerId);
    // A follower has an outgoing Follow to userId; someone being followed has
    // an incoming Follow from userId.
    const relation =
      direction === 'followers'
        ? { following: { some: { followingId: userId } } }
        : { followers: { some: { followerId: userId } } };
    return this.prisma.user.findMany({
      where: { ...visibleUsers(viewerId), ...relation },
      select: publicProfileSelect,
      orderBy: { id: 'asc' },
      take: query.limit,
      skip: query.offset,
    });
  }

  getPrivacySettings(userId: string) {
    return this.prisma.privacySetting.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  updatePrivacySettings(userId: string, dto: UpdatePrivacySettingsDto) {
    return this.prisma.privacySetting.upsert({
      where: { userId },
      create: { ...dto, userId },
      update: dto,
    });
  }
}
