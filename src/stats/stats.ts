import { Hono } from "hono";
import { getDB } from "../lib/db";
import { type Session } from "../lib/auth";
import { studyAchievements } from "../../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

const parseTags = (tags: unknown): string[] => {
  if (!tags) return [];
  try {
    return JSON.parse(tags as string) as string[];
  } catch {
    return [];
  }
};

app.get('/summary', async (c) => {
  const db = getDB(c.env);
  const user = c.get('user')!;

  try {
    const result = await db.select({
      id: studyAchievements.id,
      studyMinutes: studyAchievements.studyMinutes,
      date: studyAchievements.date
    })
      .from(studyAchievements)
      .where(eq(studyAchievements.userId, user.id))
      .orderBy(asc(studyAchievements.startDateTime))
      .limit(500);

    return c.json(result);
  } catch (e) {
    console.error(e);
    return c.json({ error: "サマリーの取得に失敗しました" }, 500);
  }
});

app.get('/:date', async (c) => {
  const db = getDB(c.env);
  const user = c.get('user')!;
  const date = c.req.param('date');

  try {
    const result = await db.select({
      id: studyAchievements.id,
      title: studyAchievements.title,
      subtitle: studyAchievements.subtitle,
      startDateTime: studyAchievements.startDateTime,
      endDateTime: studyAchievements.endDateTime,
      studyMinutes: studyAchievements.studyMinutes,
      tags: studyAchievements.tags
    })
      .from(studyAchievements)
      .where(and(
        eq(studyAchievements.userId, user.id),
        eq(studyAchievements.date, date)
      ))
      .orderBy(asc(studyAchievements.startDateTime));

    const formatted = result.map(item => ({
      ...item,
      tags: parseTags(item.tags)
    }));

    return c.json(formatted);
  } catch (e) {
    console.error(e);
    return c.json({ error: "学習ログの取得に失敗しました" }, 500);
  }
});

export default app;