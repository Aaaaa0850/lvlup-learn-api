import { Hono } from "hono";
import { type Session } from "../lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  ScheduleTitle,
  ScheduleSubtitle
} from '../types/schedule'
import { getDB } from "../lib/db";
import { eq } from "drizzle-orm";
import { subscription } from "../../drizzle/schema";

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
  lvlup_learn_kv: KVNamespace;
  AI: Ai;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

app.post('/', zValidator(
  "json",
  z.object({
    title: ScheduleTitle,
    subtitle: ScheduleSubtitle,
  })
), async (c) => {
  const { title, subtitle } = c.req.valid("json");
  const user = c.get('user')!;
  const db = getDB(c.env);
  const plan = await db.select({ plan: subscription.plan }).from(subscription).where(eq(subscription.referenceId, user.id)).limit(1).then(result => result[0]?.plan ?? 'FREE');
  console.log(plan);
  const KV = c.env.lvlup_learn_kv;
  const LIMITS = {
    FREE: 10,
    PRO: 50,
    PREMIUM: 100
  } as const;
  const WINDOW_SECONDS = 3600;
  const limit = LIMITS['PRO'];
  const key = `rate_limit:ai_gen:${user.id}`
  const currentCount = (await KV.get<number>(key, { type: 'json' })) ?? 0;
  console.log(currentCount);
  if (currentCount >= limit) {
    return c.json({ error: '1時間の利用制限に達しました。' }, 429);
  }
  try {
    const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: `Expert learning analyst. Create 3 abstract Japanese tags (Genre, Skill, Objective) for the input.
          [Rules]
          1. Never split title words directly.
          2. Translate English terms to Japanese (e.g., "AWS" -> "クラウドインフラ").
          3. Output ONLY a JSON array of strings. No prose.
          4. Response language: Japanese.
          5. Keep tech terms original (e.g. AWS, NoSQL).
          Example: ["クラウドインフラ", "NoSQL", "AWS資格"]`
        },
        { role: 'user', content: `T: ${title}, M: ${subtitle}` }
      ],
      temperature: 0.1,
    });
    console.log(response)
    const tagsJson = (response as any).response ?? response;
    const arrayMatch = tagsJson.match(/\[\s*".+?"\s*,\s*".+?"\s*,\s*".+?"\s*\]/);

    if (arrayMatch) {
      const tags = JSON.parse(arrayMatch[0]);
      await KV.put(key, JSON.stringify(currentCount + 1), {
        expirationTtl: WINDOW_SECONDS
      });
      return c.json(tags);
    }
  }
  catch (e) {
    return c.json({ error: "タグ生成に失敗しました。" }, 500);
  }
})

export default app;