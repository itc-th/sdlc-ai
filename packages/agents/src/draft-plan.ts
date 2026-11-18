import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `คุณเป็น Programmer ที่ร่างแผนการแก้โค้ด (Plan) สำหรับ software project
คุณจะได้รับ:
- repo-map: โครงสร้าง project ทั้งหมด
- เนื้อหาไฟล์ที่เกี่ยวข้อง (ถ้ามี)
- Intent และ Spec ที่อนุมัติแล้ว

กฎสำคัญ:
- **อ้างอิงไฟล์จริงและ path จริง** ที่มีในโปรเจกต์เท่านั้น ห้ามสมมติไฟล์ที่ไม่มีอยู่
- **ระบุบรรทัดหรือ function ที่ต้องแก้** ให้ชัดเจนที่สุด
- **ตรวจสอบว่า framework มี feature ที่ต้องการอยู่แล้วหรือไม่** ก่อนเสนอติดตั้ง package ใหม่
- **ชื่อ branch** ให้ตรงกับ folder ใน docs/intents/

เขียนเป็นภาษาไทย ครอบคลุมหัวข้อ:

1. สรุปสิ่งที่ต้องทำ — 1-2 ประโยค
2. ไฟล์ที่ต้องสร้าง/แก้ไข — เป็นตาราง (path จริง, การเปลี่ยนแปลง, เหตุผล)
3. ขั้นตอนการทำงาน — step-by-step อ้างอิงไฟล์และ function จริง
4. คำสั่งทดสอบ — คำสั่งจริงที่รันได้ เช่น pnpm build, pnpm test
5. เงื่อนไขสำเร็จ — checklist ที่ตรวจสอบได้
6. ความเสี่ยงและข้อควรระวัง

ตอบเป็น Markdown เท่านั้น ไม่ต้องมี heading "Plan" ซ้ำ`;

export interface RelevantFile {
  path: string;
  content: string;
}

export async function draftPlan(params: {
  issueTitle: string;
  issueBody: string | null;
  intentContent: string;
  specContent: string;
  repoMap?: string;
  relevantFiles?: RelevantFile[];
  apiKey: string;
}): Promise<string> {
  const client = new Anthropic({ apiKey: params.apiKey });

  let userMessage = `Issue: ${params.issueTitle}${params.issueBody ? `\n\nรายละเอียด:\n${params.issueBody}` : ''}

Intent ที่อนุมัติแล้ว:
${params.intentContent}

Spec ที่อนุมัติแล้ว:
${params.specContent}`;

  if (params.repoMap) {
    userMessage += `\n\n## Repo Map (โครงสร้างโปรเจกต์)\n${params.repoMap}`;
  }

  if (params.relevantFiles && params.relevantFiles.length > 0) {
    userMessage += '\n\n## ไฟล์ที่เกี่ยวข้อง';
    for (const file of params.relevantFiles) {
      userMessage += `\n\n### ${file.path}\n\`\`\`\n${file.content}\n\`\`\``;
    }
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}
