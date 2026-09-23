import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PreferencesModule } from './preferences/preferences.module';
import { BooksModule } from './books/books.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule,UsersModule, PreferencesModule, BooksModule ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
