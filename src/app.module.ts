import { LibraryModule } from './library/library.module';
import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PreferencesModule } from './preferences/preferences.module';
import { BooksModule } from './books/books.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { BooksCategoriesModule } from './books-categories/books-categories.module';
import { SearchModule } from './search/search.module';
import { ChaptersModule } from './chapters/chapters.module';

@Module({
  imports: [
    LibraryModule,
    SearchModule,
    AuthModule,
    UsersModule,
    PreferencesModule,
    BooksModule,
    CategoriesModule,
    BooksCategoriesModule,
    ChaptersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
