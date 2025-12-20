import { Hono } from 'hono'
import { Auth, WorkersKVStoreSingle, ServiceAccountCredential } from 'firebase-auth-cloudflare-workers'
import type { UserRecord } from 'firebase-auth-cloudflare-workers/dist/main/user-record'
import { type Context, type Next } from 'hono'
import schedules from './schedules/schedules'
import { z } from 'zod'

type Variables = {
  user: UserRecord
}

const app = new Hono<{ Bindings: Cloudflare.Env, Variables: Variables }>()

app.use(async (c, next) => {
  const kvStoreAuth = WorkersKVStoreSingle.getOrInitialize(
    c.env.PUBLIC_JWT_CACHE_KEY,
    c.env.lvlup_learn_kv
  )

  const saJson = c.env.FIREBASE_SERVICE_ACCOUNT!;
  const credentials = JSON.parse(saJson) as { project_id: string }

  const auth = Auth.getOrInitialize(
    credentials.project_id,
    kvStoreAuth,
    new ServiceAccountCredential(saJson)
  )

  const authz = c.req.header('Authorization')
  if (authz) {
    const idToken = authz.replace(/^Bearer\s+/i, '')
    try {
      const { uid } = await auth.verifyIdToken(idToken)
      const user = await auth.getUser(uid)
      c.set('user', user)
    } catch {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }

  await next()
});

const mustAuth = async (c: Context, next: Next) => {
  if (!c.get('user')) return c.json({ error: 'Unauthorized' }, 401);
  await next();
};

app.use('*', mustAuth);
app.route('/schedules', schedules);

export default app;
