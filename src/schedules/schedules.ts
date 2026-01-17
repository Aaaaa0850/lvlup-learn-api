import { Hono } from "hono";
import { type Session } from "../lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  ScheduleId,
  ScheduleTitle,
  ScheduleSubtitle,
  ScheduleDuration,
  color,
  tags,
} from "../types/schedule";
import { schedules } from "../../drizzle/schema";
import { nanoid } from "nanoid/non-secure";
import { eq, asc, and, desc, sql } from 'drizzle-orm'
import { getDB } from "../lib/db";

function getTomorrowJST() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset() + (9 * 60));
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const scheduleSchema = z.object({
  title: ScheduleTitle,
  subtitle: ScheduleSubtitle,
  duration: ScheduleDuration,
  color: color,
  tags: tags,
});

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

app.post('/', zValidator("json", scheduleSchema), async (c) => {
  const db = getDB(c.env);
  const user = c.get('user')!;
  const body = c.req.valid("json");

  const id = nanoid();
  const date = getTomorrowJST();

  try {
    await db.insert(schedules).values({
      id,
      ...body,
      date,
      tags: JSON.stringify(body.tags),
      userId: user.id,
    });

    return c.json({ id, ...body }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: "保存に失敗しました" }, 500);
  }
});

app.get('/', async (c) => {
  const db = getDB(c.env);
  const user = c.get('user')!;
  const date = getTomorrowJST();

  try {
    const result = await db.select({
      id: schedules.id,
      title: schedules.title,
      subtitle: schedules.subtitle,
      duration: schedules.duration,
      color: schedules.color,
      tags: schedules.tags,
    }).from(schedules)
      .where(and(eq(schedules.userId, user.id), eq(schedules.date, date)))
      .orderBy(
        sql`CASE WHEN ${schedules.duration} IS NULL THEN 1 ELSE 0 END`,
        asc(schedules.duration)
      );

    const formatted = result.map(({ tags, ...rest }) => ({
      ...rest,
      tags: tags ? (JSON.parse(tags as string) as string[]) : [],
    }));

    return c.json(formatted);
  } catch (e) {
    return c.json({ error: '取得に失敗しました' }, 500);
  }
});

app.put('/', zValidator("json", scheduleSchema.extend({ id: ScheduleId })), async (c) => {
  const db = getDB(c.env);
  const user = c.get('user')!;
  const { id, ...data } = c.req.valid("json");

  try {
    const updated = await db.update(schedules)
      .set({ ...data, tags: JSON.stringify(data.tags) })
      .where(and(eq(schedules.id, id), eq(schedules.userId, user.id)))
      .returning();

    if (updated.length === 0) return c.json({ error: "対象が見つかりません" }, 404);

    return c.json({ id, ...data });
  } catch (err) {
    return c.json({ error: '更新に失敗しました' }, 500);
  }
});

app.delete('/:id', async (c) => {
  const db = getDB(c.env);
  const user = c.get('user')!;
  const id = c.req.param("id");

  try {
    await db.delete(schedules).where(and(eq(schedules.id, id), eq(schedules.userId, user.id)));
    return c.json({ message: '削除に成功しました' });
  } catch (err) {
    return c.json({ error: '削除に失敗しました' }, 500);
  }
});

export default app;