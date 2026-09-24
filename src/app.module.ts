import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PreferencesModule } from './preferences/preferences.module';
import { BooksModule } from './books/books.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { BooksCategoriesModule } from './books-categories/books-categories.module';

@Module({
  imports: [AuthModule,UsersModule, PreferencesModule, BooksModule, CategoriesModule, BooksCategoriesModule ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
