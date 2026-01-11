import { Hono } from "hono";
import { getDB } from "../lib/db";
import { type Session } from "../lib/auth";
import { studyAchievements } from "../../drizzle/schema";
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
      title: studyAchievements.title,
      subtitle: studyAchievements.subtitle,
      startDateTime: studyAchievements.startDateTime,
      endDateTime: studyAchievements.endDateTime,
      studyHours: studyAchievements.studyHours,
      tags: studyAchievements.tags
    })
      .from(studyAchievements)
      .where(
        and(
          eq(studyAchievements.userId, user!.id),
          eq(studyAchievements.date, date)
        )
      )
      .orderBy(
        asc(studyAchievements.startDateTime)
      );
    return c.json(result, 200);
  } catch (e) {
    console.error(e);
    return c.json({ error: "学習ログの取得に失敗しました。" }, 500);
  }
})

export default app;