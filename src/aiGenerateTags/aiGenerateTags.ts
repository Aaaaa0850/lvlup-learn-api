import { Hono } from "hono";
import { type Session } from "../lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  ScheduleTitle,
  ScheduleSubtitle
} from '../types/schedule'

type Bindings = {
  lvlup_learn: D1Database;
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
  const user = 'e082e7fe-76b6-4069-b70c-d30b6b'//c.get('user');
  const KV = c.env.lvlup_learn_kv;
  const LIMITS = {
    FREE: 0,
    PRO: 5,
    PREMIUM: 15
  } as const;
  const WINDOW_SECONDS = 3600;
  const limit = LIMITS['PRO'];
  //if (limit === 0) {
  //return c.json({ error: 'Proプラン以上でご利用いただけます' }, 403);
  //}
  const key = `rate_limit:ai_gen:${user/*user!.id*/}`
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
          content:
            `content: 学習内容の分析エキスパートとして、入力内容を「ジャンル」「スキル」「目的」の観点から抽象化した日本語のタグを3つ作成し、JSON配列形式で出力してください。
            【厳守ルール】
            1. タイトルの単語をそのまま分割しない。
            2. 入力が英語（AWS, IAM等）であっても、タグは必ず日本語（例：「クラウドインフラ」「権限管理」等）に翻訳・変換すること。
            3. 出力はJSON配列のみとし、解説や挨拶は一切含めない。
            4. 返答例：["クラウドインフラ", "セキュリティ", "AWS資格"]`
        },
        { role: 'user', content: `title: ${title}, memo: ${subtitle}` }
      ],
      temperature: 0.2,
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