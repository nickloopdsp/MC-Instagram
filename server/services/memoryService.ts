import OpenAI from 'openai';
import { pool } from '../db';

const openai = new OpenAI();

/* ---------- helpers ---------- */
const embed = async (text: string) => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    // Return a zero vector as fallback
    return new Array(1536).fill(0);
  }
};

const summarize = async (text: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Summarize in one sentence: ${text}`,
      }],
      max_tokens: 40,
    });
    return response.choices[0].message.content?.trim() ?? text.slice(0, 200);
  } catch (error) {
    console.error('Error creating summary:', error);
    // Return truncated text as fallback
    return text.slice(0, 200);
  }
};

/* ---------- public API ---------- */
export async function saveTurn(
  igUserId: string,
  role: 'user' | 'assistant',
  content: string
) {
  try {
    const summary = await summarize(content);
    const embedding = await embed(summary);
    
    const query = `
      INSERT INTO conversation_messages
        (ig_user_id, role, content, content_summary, embedding)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await pool.query(query, [igUserId, role, content, summary, embedding]);
    
    console.log(`✅ Memory saved for ${igUserId} (${role}): ${summary.substring(0, 50)}...`);
  } catch (error) {
    console.error('Error saving memory:', error);
  }
}

export async function recallMemory(
  igUserId: string, 
  query: string, 
  limit = 6
): Promise<string[]> {
  try {
    const queryEmbedding = await embed(query);
    
    const sql = `
      SELECT content
      FROM conversation_messages
      WHERE ig_user_id = $1
      ORDER BY embedding <-> $2
      LIMIT $3
    `;
    
    const result = await pool.query(sql, [igUserId, queryEmbedding, limit]);
    
    const memories = result.rows.map(r => r.content);
    console.log(`🧠 Retrieved ${memories.length} memories for ${igUserId}`);
    
    return memories;
  } catch (error) {
    console.error('Error recalling memory:', error);
    return [];
  }
}

export async function getMemoryStats(igUserId: string) {
  try {
    const sql = `
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message
      FROM conversation_messages
      WHERE ig_user_id = $1
    `;
    
    const result = await pool.query(sql, [igUserId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting memory stats:', error);
    return null;
  }
}

export async function clearUserMemory(igUserId: string) {
  try {
    const sql = `DELETE FROM conversation_messages WHERE ig_user_id = $1`;
    const result = await pool.query(sql, [igUserId]);
    console.log(`🗑️  Cleared ${result.rowCount} memories for ${igUserId}`);
    return result.rowCount;
  } catch (error) {
    console.error('Error clearing memory:', error);
    return 0;
  }
}
