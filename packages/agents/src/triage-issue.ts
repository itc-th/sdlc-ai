import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `คุณเป็น SA ที่คัดแยก (triage) issue สำหรับ software project
วิเคราะห์ชื่อเรื่องและรายละเอียด แล้วตอบเป็น JSON เท่านั้น (ไม่มี markdown wrapper):

{"type":"feature|bug|data_fix","riskLevel":"low|medium|high","reason":"เหตุผลสั้น ๆ ภาษาไทย"}

เกณฑ์ประเภท:
- feature: ความต้องการใหม่หรือปรับปรุง
- bug: ข้อผิดพลาดของระบบ
- data_fix: แก้ไขข้อมูล

เกณฑ์ความเสี่ยง:
- high: แตะข้อมูลส่วนบุคคล สิทธิ์ผู้ใช้ หรือโครงสร้างฐานข้อมูล
- medium: แตะ API ที่ระบบอื่นเรียกใช้ หรือ integration ภายนอก
- low: อื่น ๆ`;

export async function triageIssue(params: {
  title: string;
  body: string | null;
  apiKey: string;
}): Promise<{ type: string; riskLevel: string; reason: string }> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const userMessage = `ชื่อเรื่อง: ${params.title}${params.body ? `\n\nรายละเอียด:\n${params.body}` : ''}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  let text = textBlock?.text ?? '{}';
  text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    return { type: 'feature', riskLevel: 'low', reason: 'ไม่สามารถวิเคราะห์ได้' };
  }
}
