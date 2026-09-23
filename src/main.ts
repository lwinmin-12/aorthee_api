import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApiDocs } from './docs/setup-api-docs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await setupApiDocs(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
