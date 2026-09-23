import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, ThemeMode } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const interestSelect = {
  id: true,
  name: true,
  slug: true,
  iconUrl: true,
  order: true,
} satisfies Prisma.InterestSelect;
const interestOrder = [
  { order: 'asc' },
  { name: 'asc' },
] satisfies Prisma.InterestOrderByWithRelationInput[];

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  listInterests() {
    return this.prisma.interest.findMany({
      select: interestSelect,
      orderBy: interestOrder,
    });
  }

  getInterests(userId: string) {
    return this.prisma.interest.findMany({
      where: { users: { some: { userId } } },
      select: interestSelect,
      orderBy: interestOrder,
    });
  }

  async saveInterests(userId: string, interestIds: string[]) {
    const ids = [...new Set(interestIds)];
    try {
      return await this.prisma.$transaction(async (tx) => {
        const interests = await tx.interest.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        });
        if (interests.length !== ids.length) {
          throw new BadRequestException(
            'One or more interest IDs do not exist',
          );
        }
        if (ids.length) {
          await tx.userInterest.createMany({
            data: ids.map((interestId) => ({ userId, interestId })),
            skipDuplicates: true,
          });
        }
        return tx.interest.findMany({
          where: { users: { some: { userId } } },
          select: interestSelect,
          orderBy: interestOrder,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('User or interest no longer exists');
      }
      throw error;
    }
  }

  updateTheme(userId: string, themeMode: ThemeMode) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { themeMode },
      select: { themeMode: true },
    });
  }
}
