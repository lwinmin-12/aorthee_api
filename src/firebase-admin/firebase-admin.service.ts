import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';

export interface VerifiedIdentity {
  uid: string;
  provider: 'APPLE' | 'GOOGLE';
  email?: string;
  name?: string;
  avatarUrl?: string;
}

export class InvalidFirebaseTokenException extends UnauthorizedException {
  constructor(code = 'INVALID_TOKEN') {
    super({
      statusCode: 401,
      message: 'Invalid or expired authentication token',
      code,
    });
  }
}

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private auth!: Auth;

  onModuleInit() {
    const appName = 'aorthee-auth';
    let app = getApps().find((candidate) => candidate.name === appName);
    if (!app) {
      const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
      let projectId = process.env.FIREBASE_PROJECT_ID;
      let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (encoded) {
        try {
          const credentials = JSON.parse(
            Buffer.from(encoded, 'base64').toString('utf8'),
          ) as Record<string, unknown>;
          projectId =
            typeof credentials.project_id === 'string'
              ? credentials.project_id
              : undefined;
          clientEmail =
            typeof credentials.client_email === 'string'
              ? credentials.client_email
              : undefined;
          privateKey =
            typeof credentials.private_key === 'string'
              ? credentials.private_key
              : undefined;
        } catch {
          throw new Error(
            'FIREBASE_SERVICE_ACCOUNT_BASE64 must contain base64-encoded service account JSON',
          );
        }
      }

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          'Firebase credentials require FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or FIREBASE_SERVICE_ACCOUNT_BASE64 with project_id, client_email, and private_key',
        );
      }

      app = initializeApp(
        {
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        },
        appName,
      );
    }
    this.auth = getAuth(app);
  }

  async verifyIdToken(token: string): Promise<VerifiedIdentity> {
    try {
      // Checking revocation makes logout-all invalidate existing ID tokens too.
      const decoded = await this.auth.verifyIdToken(token, true);
      return {
        uid: decoded.uid,
        provider:
          decoded.firebase.sign_in_provider === 'apple.com'
            ? 'APPLE'
            : 'GOOGLE',
        email: decoded.email_verified ? decoded.email : undefined,
        name: typeof decoded.name === 'string' ? decoded.name : undefined,
        avatarUrl: decoded.picture,
      };
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      throw new InvalidFirebaseTokenException(
        code === 'auth/id-token-expired'
          ? 'TOKEN_EXPIRED'
          : code === 'auth/id-token-revoked'
            ? 'TOKEN_REVOKED'
            : 'INVALID_TOKEN',
      );
    }
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    await this.auth.revokeRefreshTokens(uid);
  }
}
