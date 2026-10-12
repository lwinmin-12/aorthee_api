jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }));

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FirebaseAdminService } from '../src/firebase-admin/firebase-admin.service';

describe('OpenAPI documentation', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(FirebaseAdminService)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('documents every operation with a summary and a successful response', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const operation = item[method];
        if (!operation) continue;
        expect({ path, method, summary: operation.summary }).toEqual({
          path,
          method,
          summary: expect.any(String) as unknown,
        });
        const responses = Object.entries(operation.responses).filter(([code]) =>
          code.startsWith('2'),
        );
        expect(responses.length).toBeGreaterThan(0);
        for (const [status, response] of responses) {
          if (status !== '204') expect(response).toHaveProperty('content');
        }
      }
    }
  });

  it('preserves inherited PATCH schemas and optional fields', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    const schemas = doc.components?.schemas;
    for (const [name, fields] of [
      ['UpdateChapterDto', ['title', 'order', 'releaseAt']],
      ['UpdateChapterPageDto', ['imageUrl', 'width', 'height', 'order']],
      ['UpdateCategoryDto', ['name', 'slug', 'order']],
    ] as const) {
      const schema = schemas?.[name];
      expect(schema).toBeDefined();
      if (!schema || '$ref' in schema)
        throw new Error(`Missing schema: ${name}`);
      for (const field of fields)
        expect(schema.properties).toHaveProperty(field);
      expect(schema.required ?? []).toEqual([]);
    }
  });

  it('describes chapter content variants, pagination, and protected writes', () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(
      doc.paths['/chapters/{id}/content'].get?.responses['200'],
    ).toHaveProperty('content.application/json.schema.oneOf');
    expect(doc.paths['/chapters/{id}/text'].put?.security).toEqual([
      { bearer: [] },
    ]);
    expect(doc.paths['/books/{bookId}/chapters'].get?.security).toBeUndefined();
    const params = doc.paths['/categories/{slug}/books'].get?.parameters ?? [];
    expect(
      params.map((param) => ('$ref' in param ? param.$ref : param.name)),
    ).toEqual(expect.arrayContaining(['slug', 'page', 'limit', 'type']));
    const assignment = doc.paths['/books/{bookId}/categories'].post;
    expect(assignment?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'bookId', in: 'path', required: true }),
      ]),
    );
    expect(assignment?.security).toEqual([{ bearer: [] }]);
  });
});
