import OpenAI from "openai";
import { pool } from "../db";

// Environment-configurable flags with sensible defaults
const MEMORY_ENABLED = (process.env.MEMORY_ENABLED ?? "true").toLowerCase() !== "false";
const MEMORY_MAX_TOKENS = Number.parseInt(process.env.MEMORY_MAX_TOKENS || "800", 10);
const MEMORY_MIN_SCORE = Number.parseFloat(process.env.MEMORY_MIN_SCORE || "0.82");

// Rough token estimator: ~4 chars per token
const CHARS_PER_TOKEN_APPROX = 4;
const MAX_CHARS = MEMORY_MAX_TOKENS * CHARS_PER_TOKEN_APPROX;

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR;
    if (!apiKey || apiKey === "placeholder_key") {
      throw new Error("OPENAI_API_KEY is required for memory service");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

/* ---------- helpers ---------- */
export async function embed(text: string): Promise<number[]> {
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding as unknown as number[];
}

export async function summarize(text: string): Promise<string> {
  try {
    const client = getOpenAI();
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Summarize in one sentence: ${text}`,
        },
      ],
      max_tokens: 40,
      temperature: 0.2,
    });
    return res.choices[0].message.content?.trim() || text.slice(0, 200);
  } catch (_err) {
    return text.slice(0, 200);
  }
}

function toVectorLiteral(vec: number[]): string {
  // pgvector textual format, cast where used
  return `[${vec.join(",")}]`;
}

/* ---------- public API ---------- */
export async function saveTurn(
  igUserId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  if (!MEMORY_ENABLED) return;
  try {
    const summary = await summarize(content);
    const emb = await embed(summary);
    const vectorLiteral = toVectorLiteral(emb);
    await pool.query(
      `insert into conversation_messages
        (ig_user_id, role, content, content_summary, embedding)
       values ($1, $2, $3, $4, $5::vector(1536))`,
      [igUserId, role, content, summary, vectorLiteral]
    );
  } catch (err) {
    console.error("memoryService.saveTurn error:", err);
  }
}

export async function recallMemory(
  igUserId: string,
  query: string,
  limit = 6
): Promise<string[]> {
  if (!MEMORY_ENABLED) return [];
  try {
    const qEmb = await embed(query);
    const vectorLiteral = toVectorLiteral(qEmb);

    // Retrieve by cosine distance, compute similarity = 1 - distance
    const { rows } = await pool.query(
      `select content, 1 - (embedding <=> $2::vector(1536)) as score
       from conversation_messages
       where ig_user_id = $1
       order by embedding <=> $2::vector(1536)
       limit $3`,
      [igUserId, vectorLiteral, Math.max(limit * 2, limit)]
    );

    const snippets: string[] = [];
    let usedChars = 0;
    for (const row of rows) {
      const score = Number(row.score ?? 0);
      const content: string = row.content ?? "";
      if (!content) continue;
      if (score < MEMORY_MIN_SCORE) continue;
      if (usedChars + content.length > MAX_CHARS) break;
      snippets.push(content);
      usedChars += content.length;
      if (snippets.length >= limit) break;
    }
    return snippets;
  } catch (err) {
    console.error("memoryService.recallMemory error:", err);
    return [];
  }
}

export const memoryConfig = {
  enabled: MEMORY_ENABLED,
  maxTokens: MEMORY_MAX_TOKENS,
  minScore: MEMORY_MIN_SCORE,
};


