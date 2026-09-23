import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { FirebaseAdminModule } from '../firebase-admin/firebase-admin.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AgeVerifiedGuard } from './guards/age-verified.guard';
@Module({
  imports: [FirebaseAdminModule, PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AgeVerifiedGuard,
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
  exports: [AgeVerifiedGuard],
})
export class AuthModule {}
