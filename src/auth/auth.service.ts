import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { FirebaseAdminService } from '../firebase-admin/firebase-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { User } from 'generated/prisma/client';

// An allowlist prevents future internal model fields from leaking into API responses.
export function userProfile(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    coverPhotoUrl: user.coverPhotoUrl,
    bio: user.bio,
    birthDate: user.birthDate,
    isAgeVerified: user.isAgeVerified,
    ageVerifiedAt: user.ageVerifiedAt,
    isMinor: user.isMinor,
    role: user.role,
    themeMode: user.themeMode,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseAdminService,
  ) {}

  async verifyAge(userId: string, birthDate: string) {
    const now = new Date();
    const date = new Date(`${birthDate}T00:00:00.000Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== birthDate ||
      date > now
    )
      throw new BadRequestException(
        'birthDate must be a valid date in the past',
      );
    let age = now.getUTCFullYear() - date.getUTCFullYear();
    if (
      now.getUTCMonth() < date.getUTCMonth() ||
      (now.getUTCMonth() === date.getUTCMonth() &&
        now.getUTCDate() < date.getUTCDate())
    )
      age--;
    if (age < 12)
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Must be 12 or older',
        code: 'AGE_REQUIREMENT_NOT_MET',
      });
    return userProfile(
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          birthDate: date,
          isAgeVerified: true,
          ageVerifiedAt: now,
          isMinor: age < 18,
        },
      }),
    );
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    const data = {
      platform: dto.platform,
      fcmToken: dto.fcmToken,
      lastActiveAt: new Date(),
      revokedAt: null,
    };
    return this.prisma.session.upsert({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
      create: { userId, deviceId: dto.deviceId, ...data },
      update: data,
      select: {
        id: true,
        deviceId: true,
        platform: true,
        lastActiveAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeSession(userId: string, deviceId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(user: User): Promise<void> {
    await this.firebase.revokeRefreshTokens(user.firebaseUid);
    await this.prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
