import { Hono } from "hono";
import { getDB } from "../lib/db";
import { type Session } from "../lib/auth";
import { studyLogs } from "../../drizzle/schema";
import {
  eq,
  and,
  asc
} from "drizzle-orm";

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

app.get('/:date', async (c) => {
  const db = getDB(c.env);
  const user = c.get('user');
  const date = c.req.param('date');
  try {
    const result = await db.select({
      title: studyLogs.title,
      subtitle: studyLogs.subtitle,
      startDateTime: studyLogs.startDateTime,
      endDateTime: studyLogs.endDateTime,
      studyHours: studyLogs.studyHours,
      tags: studyLogs.tags
    })
      .from(studyLogs)
      .where(
        and(
          eq(studyLogs.userId, user!.id),
          eq(studyLogs.date, date)
        )
      )
      .orderBy(
        asc(studyLogs.startDateTime)
      );
    return c.json(result, 200);
  } catch (e) {
    console.error(e);
    return c.json({ error: "学習ログの取得に失敗しました。" }, 500);
  }
})

export default app;