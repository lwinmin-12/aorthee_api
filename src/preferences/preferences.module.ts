import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  InterestsController,
  UserPreferencesController,
} from './preferences.controller';
import { PreferencesService } from './preferences.service';

@Module({
  imports: [PrismaModule],
  controllers: [InterestsController, UserPreferencesController],
  providers: [PreferencesService],
})
export class PreferencesModule {}
