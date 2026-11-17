import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `คุณเป็น SA (System Analyst) ที่ร่าง Spec document สำหรับ software project
เขียนเป็นภาษาไทย ครอบคลุมหัวข้อต่อไปนี้:

1. ระบบย่อยที่เกี่ยวข้อง
2. ข้อเท็จจริงจากระบบปัจจุบัน (ถ้ามี)
3. ข้อเสนอการออกแบบ — อธิบายรายละเอียดทางเทคนิค
4. ไฟล์ที่ต้องสร้าง/แก้ไข (เป็นตาราง)
5. เกณฑ์ว่าเสร็จ — เป็น checklist
6. ความเสี่ยงและ policy

ตอบเป็น Markdown เท่านั้น ไม่ต้องมี heading "Spec" ซ้ำ`;

export async function draftSpec(params: {
  issueTitle: string;
  issueBody: string | null;
  intentContent: string;
  apiKey: string;
}): Promise<string> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const userMessage = `Issue: ${params.issueTitle}${params.issueBody ? `\n\nรายละเอียด:\n${params.issueBody}` : ''}

Intent ที่อนุมัติแล้ว:
${params.intentContent}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}
