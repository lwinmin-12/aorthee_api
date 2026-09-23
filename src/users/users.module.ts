import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CurrentUserController, UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [CurrentUserController, UsersController],
  providers: [UsersService],
})
export class UsersModule {}
