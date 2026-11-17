import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `คุณเป็น Programmer ที่ร่างแผนการแก้โค้ด (Plan) สำหรับ software project
เขียนเป็นภาษาไทย ครอบคลุมหัวข้อต่อไปนี้:

1. สรุปสิ่งที่ต้องทำ — อธิบายสั้น ๆ ว่าจะแก้อะไร
2. ไฟล์ที่ต้องสร้าง/แก้ไข — เป็นตาราง (ไฟล์, การเปลี่ยนแปลง, เหตุผล)
3. ขั้นตอนการทำงาน — เรียงลำดับ step-by-step
4. การทดสอบ — วิธีตรวจสอบว่าทำสำเร็จ
5. ความเสี่ยงและข้อควรระวัง

ตอบเป็น Markdown เท่านั้น ไม่ต้องมี heading "Plan" ซ้ำ`;

export async function draftPlan(params: {
  issueTitle: string;
  issueBody: string | null;
  intentContent: string;
  specContent: string;
  apiKey: string;
}): Promise<string> {
  const client = new Anthropic({ apiKey: params.apiKey });

  const userMessage = `Issue: ${params.issueTitle}${params.issueBody ? `\n\nรายละเอียด:\n${params.issueBody}` : ''}

Intent ที่อนุมัติแล้ว:
${params.intentContent}

Spec ที่อนุมัติแล้ว:
${params.specContent}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}
