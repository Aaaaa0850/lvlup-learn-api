import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { studyLogs } from '../../drizzle/schema';
import { type Session } from '../lib/auth';
import {
  and,
  eq
} from 'drizzle-orm';

type Bindings = {
  lvlup_learn: D1Database;
  AI: Ai
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

app.get('/', async (c) => {

})