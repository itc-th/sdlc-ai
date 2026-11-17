import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `คุณช่วยสร้าง GitHub issue สำหรับ software project
ผู้ใช้จะอธิบายปัญหาหรือความต้องการสั้น ๆ คุณต้องตอบเป็น JSON เท่านั้น (ไม่มี markdown wrapper) ในรูปแบบ:

{
  "title": "ชื่อเรื่องกระชับ ไม่เกิน 100 ตัวอักษร เขียนเป็นภาษาไทย",
  "body": "รายละเอียดเป็น Markdown ภาษาไทย อธิบายปัญหา/ความต้องการ ผลกระทบ และสิ่งที่คาดหวัง",
  "type": "feature | bug | data_fix"
}

เลือก type ตามเนื้อหา:
- feature: ความต้องการใหม่หรือปรับปรุง
- bug: ข้อผิดพลาดของระบบ
- data_fix: แก้ไขข้อมูล`;

export async function draftIssue(params: {
  description: string;
  apiKey: string;
}): Promise<{ title: string; body: string; type: string }> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: params.description }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  let text = textBlock?.text ?? '{}';

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    return { title: '', body: text, type: 'feature' };
  }
}
