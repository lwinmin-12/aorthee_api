<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Authentication

All routes require `Authorization: Bearer <Firebase ID token>` unless decorated
with `@Public()`. The starter `GET /` route is public. Google and Apple sign-in
happen on the client; this API does not issue or persist authentication tokens.

Configuration (environment variables, also loaded from local `.env`):

- `DATABASE_URL`: PostgreSQL connection URL.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`:
  Firebase service account fields. The private key accepts real newlines or literal `\n`.
- Alternatively, `FIREBASE_SERVICE_ACCOUNT_BASE64`: base64-encoded Firebase service
  account JSON (takes precedence over the individual fields).
  Keep all credentials outside source control.

### Prisma prerequisite

This checkout did not include the existing Prisma schema described in the task.
No schema or migrations have been added or changed. Restore the authoritative
schema before building a fresh checkout. This implementation uses Prisma 7 and
expects its generated client in `src/generated/prisma` with CommonJS output:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}
```

The relative output above assumes the schema lives in `prisma/schema.prisma`.
Run `npx prisma generate --schema prisma/schema.prisma` after restoring it. The
client directory is ignored by Git. PostgreSQL connectivity uses `PrismaPg` and
`DATABASE_URL`; deployment must provision the existing schema separately.

### Endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/interests` | Public; all interest options sorted by `order`, then `name` |
| POST | `/users/me/interests` | Firebase; `{ "interestIds": ["..."] }`; bulk adds selections, ignores duplicates, retains existing selections; returns all selected interest options (201) |
| GET | `/users/me/interests` | Firebase; current user's selected interest options in display order |
| PATCH | `/users/me/theme` | Firebase; `{ "themeMode": "LIGHT\|DARK\|SYSTEM" }`; returns `{ "themeMode": "..." }` |
| GET | `/auth/me` | Own profile, excluding Firebase UID and internal account fields |
| POST | `/auth/verify-age` | `{ "birthDate": "YYYY-MM-DD" }`; UTC calendar age, minimum 12 |
| POST | `/auth/sessions` | `{ "deviceId": "...", "platform": "IOS\|ANDROID\|WEB", "fcmToken": "..." }`; FCM token optional |
| DELETE | `/auth/sessions/:deviceId` | Revoke the authenticated user's device registration; idempotent 204 |
| POST | `/auth/logout-all` | Revoke Firebase refresh tokens and all local device registrations; 204 |

Session registration reactivates an existing device and refreshes its activity
time. Device revocation records local state; it does not revoke a Firebase ID
token for that device. Logout-all checks Firebase revocation on later requests
using `verifyIdToken(token, true)`, as documented in the
[Firebase Admin reference](https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.baseauth).

Use `@CurrentUser()` for the local Prisma user. `@Roles(UserRole.CREATOR,
UserRole.ADMIN)` restricts routes after authentication. Apply
`@UseGuards(AgeVerifiedGuard)` to routes requiring completed age verification.
That guard checks verification only; enforce any additional adult-only content
policy separately using `isMinor`. Service methods can call
`assertOwnerOrAdmin(user, resource)` after loading a resource with `authorId`.

First login creates the local profile; later logins preserve local profile
fields. Only verified Firebase email claims are copied. Suspended, deleted,
and soft-deleted users are denied. Client-facing error codes include
`INVALID_TOKEN`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `ACCOUNT_SUSPENDED`,
`ACCOUNT_DELETED`, `AGE_VERIFICATION_REQUIRED`, and `AGE_REQUIREMENT_NOT_MET`.

### Authentication tests

```bash
npm run build
npm test -- --runInBand --watchman=false
npm run test:e2e -- --runInBand --watchman=false
npm run lint
```

Unit and HTTP e2e tests mock Firebase and Prisma; they need no credentials or
running database. They do not verify live Firebase or PostgreSQL connectivity.

## Interactive API documentation

Install dependencies with `npm install`, configure `.env` as described above,
then start the API with `npm run start:dev`.

With the default port (`3000`):

- Swagger UI: http://localhost:3000/docs
- Scalar API reference: http://localhost:3000/reference
- OpenAPI JSON: http://localhost:3000/openapi.json
- OpenAPI YAML: http://localhost:3000/openapi.yaml

Both interfaces use the same generated OpenAPI document. Documentation routes
are public. Scalar loads its browser UI from the default jsDelivr CDN, so the
browser needs internet access. Replace port `3000` when setting `PORT`.

To try authenticated endpoints, sign in with Firebase on the client and copy
its **ID token**. In Swagger, click **Authorize** and paste the token; in Scalar,
enter it in the Bearer authentication field. Enter only the token, without the
`Bearer ` prefix. Requests to `/auth/*` require it; `GET /` is public.

Configuration lives in `src/docs/setup-api-docs.ts`. Add Swagger decorators to
new controllers and DTOs to keep summaries, request schemas, response schemas,
and authentication requirements current. Never include real credentials in
examples.

Integration references: [NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
and [Scalar for NestJS](https://scalar.com/products/api-references/integrations/nestjs).

Interest saves reject unknown IDs with 400 before inserting any selections. An empty
array leaves selections unchanged. Preference requests reject unexpected fields;
these endpoints do not require age verification. `/auth/me` includes `themeMode`.

### Users and profiles

| Method | Path | Authentication | Request / response |
| --- | --- | --- | --- |
| GET | `/users/:id` | Optional Firebase | Public profile fields: `id`, `username`, `name`, `avatarUrl`, `coverPhotoUrl`, `bio` |
| GET | `/users/username/:username` | Public / optional Firebase | Same profile, looked up by exact username |
| PATCH | `/users/me` | Firebase | Optional `name`, `avatarUrl`, `bio`, `username`; returns own profile |
| PATCH | `/users/me/cover-photo` | Firebase | Required `coverPhotoUrl`; returns own profile |
| POST | `/users/me/social-links` | Firebase | Required `platform`, `url`; optional `order` (default 0); returns social link (201) |
| PATCH | `/users/me/social-links/:id` | Firebase | Optional `platform`, `url`, `order`; returns updated social link |
| DELETE | `/users/me/social-links/:id` | Firebase | Deletes own link (204); missing or unowned link returns 404 |
| GET | `/users/:id/social-links` | Public / optional Firebase | Social links ordered by `order`, then `id` |
| POST | `/users/:id/follow` | Firebase | Returns new or existing `Follow` row (201) |
| DELETE | `/users/:id/follow` | Firebase | Idempotent unfollow (204), including when the target no longer allows follows |
| GET | `/users/:id/followers` | Public / optional Firebase | Array of visible follower profiles |
| GET | `/users/:id/following` | Public / optional Firebase | Array of visible profiles the user follows |
| GET | `/users/me/privacy-settings` | Firebase | Gets `PrivacySetting`, creating schema defaults if absent |
| PATCH | `/users/me/privacy-settings` | Firebase | Optional `profileVisibility`, `showReadingActivity`, `showLibrary`, `allowFollow`; returns settings |

Public reads enforce `profileVisibility`. `PUBLIC` (also the default when no
settings row exists) permits anonymous reads; `FOLLOWERS_ONLY` permits the owner
and authenticated followers; `PRIVATE` permits only the owner. Missing, inactive,
and invisible profiles return 404. Social-link and connection lists enforce the
same rule; connection lists also exclude members whose profiles the viewer cannot
see. Optional authentication verifies any supplied token; invalid credentials
return 401. Public responses never include email, phone, Firebase identity, birth
date, or private settings.

Follower/following lists accept `?limit=20&offset=0` (`limit`: 1–100, `offset`:
nonnegative integer), sort by user ID, and return arrays. Self-follow returns 400;
`allowFollow: false` prevents new follow requests with 403. Changing that setting
does not remove existing follows. Following is immediate; there is no follow
approval workflow in the current schema.

Profile fields and `coverPhotoUrl` accept `null` to clear them. Usernames are
case-sensitive, unique, and contain 3–30 ASCII letters, digits, or underscores;
conflicts return 409. Names are limited to 100 characters, bios to 300, platforms
to 50, and URLs to 2048. URLs must use HTTP or HTTPS. Social-link order is a
nonnegative 32-bit integer. Privacy visibility is `PUBLIC`, `FOLLOWERS_ONLY`, or
`PRIVATE`; its other fields require booleans. Unexpected body fields are rejected.
`showLibrary` and `showReadingActivity` are stored for future library/activity
endpoints; this module does not expose those resources.

The user endpoint HTTP tests mock Firebase and Prisma and cover authentication,
visibility query filters, ownership, validation, pagination, and error responses.
They do not exercise a live database or Firebase project.

### Books and comics

| Method | Path | Authentication | Behavior |
| --- | --- | --- | --- |
| GET | `/books` | Public | Array of published books/comics; `limit` (default 20, max 100), `offset` (default 0), optional `type=BOOK` or `type=COMIC` |
| GET | `/books/:slug` | Public | Published book/comic metadata by slug; 404 for missing, draft, or archived books |
| POST | `/books` | Firebase, CREATOR | Creates a draft owned by the caller; returns book (201) |
| PATCH | `/books/:id` | Firebase, owner or ADMIN | Edits metadata; returns updated book (200) |
| POST | `/books/:id/publish` | Firebase, owner or ADMIN | Sets `status=PUBLISHED`, `publishedAt=now()`; returns book (200) |
| DELETE | `/books/:id` | Firebase, owner or ADMIN | Sets `status=ARCHIVED`; no response body (204) |

Create a draft with:

```json
{
  "slug": "the-last-library",
  "title": "The Last Library",
  "type": "BOOK",
  "synopsis": "A reader discovers a forgotten world.",
  "coverImageUrl": "https://example.com/cover.jpg",
  "ageRating": "ALL",
  "language": "en",
  "tags": ["fantasy"]
}
```

`slug`, `title`, and `type` are required. Optional fields default to the schema's
values (`ageRating=ALL`, `language=en`, `tags=[]`). Slugs use lowercase letters,
digits, and single hyphens between segments (maximum 200 characters); duplicate
slugs return 409. Titles must contain non-whitespace text and are limited to 200
characters. Synopses are limited to 10,000 characters; cover URLs must use HTTP or
HTTPS and are limited to 2048 characters. `ageRating` accepts `ALL`, `TEEN`, or
`MATURE`. Language accepts a 2–8 letter language code with optional hyphenated
subtags (maximum 35 characters). Tags are limited to 20 unique, nonblank strings
of at most 50 characters each.

PATCH accepts any subset of those fields except `type`, which stays fixed to
preserve chapter content compatibility. `synopsis` and `coverImageUrl` accept
`null` to clear them. Clients cannot set author identity, status, publication
timestamps, or counters through metadata requests. Creation requires the CREATOR
role specifically; ownership or ADMIN grants permission for subsequent writes.

Public results include book metadata and counters, with no chapter content or
private author fields. They exclude books belonging to suspended, deleted, or
soft-deleted authors. Browse results sort by publication time descending, then ID
ascending for stable pagination. The public endpoints do not expose drafts even
when called by their owner.

Publishing also supports archived books and resets `publishedAt` on each call.
Archiving preserves the book, its publication timestamp, chapters, favorites, and
reading progress; repeated archiving succeeds. Missing books return 404 and
unauthorized ownership attempts return 403. No database migration is required.
