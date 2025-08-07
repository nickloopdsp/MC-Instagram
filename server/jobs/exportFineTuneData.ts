import { pool } from '../db';
import * as fs from 'fs';
import * as path from 'path';

interface ConversationMessage {
  convo_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

interface FineTunePair {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

// Simple PII redaction
function redactPII(text: string): string {
  return text
    // Redact email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    // Redact phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    // Redact URLs
    .replace(/https?:\/\/[^\s]+/g, '[URL]')
    // Redact Instagram handles
    .replace(/@[a-zA-Z0-9._]+/g, '[HANDLE]')
    // Redact potential names (simple heuristic)
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]');
}

// Truncate content to fit token limits
function truncateContent(content: string, maxTokens: number = 4000): string {
  // Rough estimation: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  if (content.length <= maxChars) return content;
  
  return content.substring(0, maxChars) + '...';
}

// Group messages into conversation pairs
function groupIntoPairs(messages: ConversationMessage[]): FineTunePair[] {
  const pairs: FineTunePair[] = [];
  const conversations = new Map<string, ConversationMessage[]>();
  
  // Group messages by conversation
  for (const msg of messages) {
    if (!conversations.has(msg.convo_id)) {
      conversations.set(msg.convo_id, []);
    }
    conversations.get(msg.convo_id)!.push(msg);
  }
  
  // Create pairs from each conversation
  for (const convoId of Array.from(conversations.keys())) {
    const msgs = conversations.get(convoId)!;
    const sortedMsgs = msgs.sort((a: ConversationMessage, b: ConversationMessage) => a.created_at.getTime() - b.created_at.getTime());
    
    // Find user-assistant pairs
    for (let i = 0; i < sortedMsgs.length - 1; i++) {
      const current = sortedMsgs[i];
      const next = sortedMsgs[i + 1];
      
      // Only create pairs where user message is followed by assistant response
      if (current.role === 'user' && next.role === 'assistant') {
        const userContent = redactPII(current.content);
        const assistantContent = redactPII(next.content);
        
        // Skip if content is too short or seems like system messages
        if (userContent.length < 10 || assistantContent.length < 10) continue;
        if (userContent.includes('[ACTION]') || assistantContent.includes('[ACTION]')) continue;
        
        pairs.push({
          messages: [
            { role: 'user', content: truncateContent(userContent) },
            { role: 'assistant', content: truncateContent(assistantContent) }
          ]
        });
      }
    }
  }
  
  return pairs;
}

async function exportFineTuneData() {
  console.log('🔄 Starting fine-tune data export...');
  
  try {
    // Query for recent conversation messages
    const query = `
      SELECT 
        ig_user_id as convo_id,
        role,
        content,
        created_at
      FROM conversation_messages
      WHERE created_at > NOW() - INTERVAL '1 day'
        AND content IS NOT NULL
        AND content != ''
      ORDER BY ig_user_id, created_at
    `;
    
    const result = await pool.query(query);
    const messages: ConversationMessage[] = result.rows.map(row => ({
      convo_id: row.convo_id,
      role: row.role,
      content: row.content,
      created_at: new Date(row.created_at)
    }));
    
    console.log(`📊 Found ${messages.length} messages from the last 24 hours`);
    
    if (messages.length === 0) {
      console.log('⚠️  No messages found for export');
      return;
    }
    
    // Group into conversation pairs
    const pairs = groupIntoPairs(messages);
    console.log(`🔄 Created ${pairs.length} conversation pairs`);
    
    if (pairs.length === 0) {
      console.log('⚠️  No valid conversation pairs found');
      return;
    }
    
    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `fine_tune_${today}.jsonl`;
    const filepath = path.join(exportsDir, filename);
    
    // Write JSONL file
    const jsonlContent = pairs
      .map(pair => JSON.stringify(pair))
      .join('\n');
    
    fs.writeFileSync(filepath, jsonlContent);
    
    console.log(`✅ Exported ${pairs.length} pairs to ${filepath}`);
    console.log(`📁 File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    
    // Check if file is too large (50MB limit)
    const fileSizeMB = fs.statSync(filepath).size / (1024 * 1024);
    if (fileSizeMB > 50) {
      console.log(`⚠️  Warning: File size (${fileSizeMB.toFixed(2)} MB) exceeds 50MB limit`);
      console.log('   Consider reducing the time window or implementing sampling');
    }
    
    // Also save to a master file for cumulative training
    const masterFile = path.join(exportsDir, 'master_fine_tune.jsonl');
    const existingContent = fs.existsSync(masterFile) ? fs.readFileSync(masterFile, 'utf8') : '';
    const newContent = existingContent + (existingContent ? '\n' : '') + jsonlContent;
    
    // Deduplicate based on content hash
    const lines = newContent.split('\n').filter(line => line.trim());
    const uniqueLines = Array.from(new Set(lines));
    fs.writeFileSync(masterFile, uniqueLines.join('\n'));
    
    console.log(`✅ Updated master file with ${uniqueLines.length} total pairs`);
    
  } catch (error) {
    console.error('❌ Error exporting fine-tune data:', error);
    throw error;
  }
}

// Run the export if called directly
if (require.main === module) {
  exportFineTuneData()
    .then(() => {
      console.log('✅ Fine-tune data export completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fine-tune data export failed:', error);
      process.exit(1);
    });
}

export { exportFineTuneData };
