import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `คุณเป็น SA (System Analyst) ที่ร่าง Intent document สำหรับ software project
เขียนเป็นภาษาไทย ครอบคลุมหัวข้อต่อไปนี้:

1. ปัญหา/ที่มา — อธิบายว่าทำไมต้องทำงานนี้
2. ผู้ใช้ที่ได้รับผลกระทบ
3. ขอบเขต — สิ่งที่จะทำและไม่ทำ
4. เกณฑ์ว่าเสร็จ (Acceptance Criteria) — เป็น checklist
5. ระดับความเสี่ยง (ต่ำ/กลาง/สูง) พร้อมเหตุผล

ตอบเป็น Markdown เท่านั้น ไม่ต้องมี heading "Intent" ซ้ำ`;

export async function draftIntent(params: {
  issueTitle: string;
  issueBody: string | null;
  apiKey: string;
}): Promise<string> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const userMessage = `Issue: ${params.issueTitle}${params.issueBody ? `\n\nรายละเอียด:\n${params.issueBody}` : ''}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}
