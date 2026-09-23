import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export async function setupApiDocs(app: INestApplication): Promise<void> {
  // Scalar is ESM; a dynamic import also works with Nest's CommonJS output.
  const { apiReference } = await import('@scalar/nestjs-api-reference');
  const config = new DocumentBuilder()
    .setTitle('Aorthee API')
    .setDescription(
      'Sign in with Google or Apple through Firebase on the client, then use the Firebase ID token as a Bearer token for authenticated endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'Firebase ID token',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: '/openapi.json',
    yamlDocumentUrl: '/openapi.yaml',
    customSiteTitle: 'Aorthee API — Swagger',
  });
  app.use(
    '/reference',
    apiReference({ url: '/openapi.json', title: 'Aorthee API' }),
  );
}
