import { Hono } from 'hono'
import { Auth, WorkersKVStoreSingle, ServiceAccountCredential } from 'firebase-auth-cloudflare-workers';
import type { UserRecord } from 'firebase-auth-cloudflare-workers/dist/main/user-record';
import * as credentials from '../lvlup-learn-firebase-adminsdk-fbsvc-7b90f9fa3c.json';
import type { Context, Next } from 'hono';

type Variables = {
  user?: UserRecord;
}

const app = new Hono<{ Bindings: Cloudflare.Env, Variables: Variables }>()

app.use(async (c, next) => {
  const kvStoreAuth = WorkersKVStoreSingle.getOrInitialize(
    c.env.PUBLIC_JWT_CACHE_KEY,
    c.env.lvlup_learn_kv
  );

  const auth = Auth.getOrInitialize(
    credentials.project_id,
    kvStoreAuth,
    new ServiceAccountCredential(JSON.stringify(credentials))
  );

  const authz = c.req.header('Authorization');
  if (authz) {
    const idToken = authz.replace(/^Bearer\s+/i, '');
    try {
      const { uid } = await auth.verifyIdToken(idToken);
      const user = await auth.getUser(uid);
      c.set('user', user);
    } catch (err) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }

  await next();
});

const mustAuth = async (c: Context, next: Next) => {
  if (!c.get('user')) return c.json({ error: 'Unauthorized' }, 401);
  await next();
};

export default app
