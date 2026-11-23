## 1. ปัญหา/ที่มา

ปัจจุบันระบบแสดงรายละเอียดของ Issues เป็น plain text ทั้งหมด โดยไม่มีการ render Markdown formatting ทำให้เนื้อหาที่ผู้ใช้พยายามจัดรูปแบบด้วย Markdown syntax (เช่น ตัวหนา, ตัวเอียง, หัวข้อ, ตาราง, รายการ, code blocks) แสดงผลออกมาพร้อมกับ syntax characters แบบดิบๆ 

ปัญหานี้ส่งผลให้:
- เนื้อหาอ่านยาก ไม่มีโครงสร้างที่ชัดเจน
- ข้อมูลที่ผู้ใช้จัดโครงสร้างไว้สูญเสียความหมายและวัตถุประสงค์
- ประสบการณ์การใช้งานไม่ดี ไม่เป็นมาตรฐานเมื่อเทียบกับระบบจัดการ Issues อื่นๆ
- ผู้ใช้ต้องใช้เวลามากขึ้นในการทำความเข้าใจเนื้อหา

## 2. ผู้ใช้ที่ได้รับผลกระทบ

- **ผู้สร้าง Issues** — ไม่สามารถนำเสนอข้อมูลในรูปแบบที่จัดระเบียบและอ่านง่าย
- **ผู้อ่าน/ผู้ติดตาม Issues** — ประสบปัญหาในการอ่านและทำความเข้าใจเนื้อหา โดยเฉพาะ Issues ที่มีรายละเอียดยาวหรือซับซ้อน
- **ทีมพัฒนา** — ไม่สามารถใช้ code blocks เพื่อแสดง code snippets, error messages, หรือ logs อย่างชัดเจน
- **Product Owners/Project Managers** — ไม่สามารถใช้ตารางหรือรายการเพื่อจัดลำดับความสำคัญหรือแสดงข้อมูลเชิงโครงสร้าง

## 3. ขอบเขต

### สิ่งที่จะทำ
- เพิ่ม Markdown renderer เพื่อแปลง Markdown syntax เป็น HTML ในหน้ารายละเอียด Issues
- รองรับ Markdown syntax พื้นฐานที่ใช้บ่อย:
  - Headings (H1-H6)
  - Text formatting (bold, italic, strikethrough)
  - Lists (ordered และ unordered)
  - Links และ images
  - Code blocks (inline และ fenced code blocks)
  - Tables
  - Blockquotes
  - Horizontal rules
- จัดการ CSS styling สำหรับ Markdown elements ให้แสดงผลสวยงามและสอดคล้องกับ design system ของระบบ
- ทดสอบการแสดงผลกับ Markdown samples ที่หลากหลาย
- ป้องกัน XSS (Cross-Site Scripting) โดย sanitize HTML output

### สิ่งที่ไม่ทำ
- ไม่รองรับ Markdown extensions หรือ custom syntax ที่ไม่ใช่มาตรฐาน (เช่น emoji shortcuts, task lists, footnotes) ในเวอร์ชันแรก
- ไม่เพิ่ม WYSIWYG editor หรือ preview mode ในหน้าสร้าง/แก้ไข Issues (อาจทำในอนาคต)
- ไม่แก้ไขข้อมูล Markdown ที่มีอยู่แล้วในระบบ — render เฉพาะตอนแสดงผลเท่านั้น
- ไม่เปลี่ยนแปลงวิธีการจัดเก็บข้อมูล (ยังเก็บเป็น plain text Markdown)
- ไม่ทำ syntax highlighting สำหรับ code blocks ในเวอร์ชันแรก

## 4. เกณฑ์ว่าเสร็จ (Acceptance Criteria)

- [ ] Markdown renderer ถูก integrate เข้ากับหน้ารายละเอียด Issues สำเร็จ
- [ ] แสดงผล Markdown headings (H1-H6) ได้ถูกต้อง
- [ ] แสดงผล text formatting (bold, italic, strikethrough) ได้ถูกต้อง
- [ ] แสดงผล ordered lists และ unordered lists ได้ถูกต้องพร้อม indentation
- [ ] แสดงผล links ที่สามารถคลิกได้และ images ที่สามารถแสดงผลได้
- [ ] แสดงผล code blocks (inline และ fenced) ด้วย monospace font และมี background สีต่าง
- [ ] แสดงผล tables พร้อม borders และ alignment ที่ถูกต้อง
- [ ] แสดงผล blockquotes และ horizontal rules ได้ถูกต้อง
- [ ] CSS styling สอดคล้องกับ design system และดูสวยงาม responsive
- [ ] มีการ sanitize HTML output เพื่อป้องกัน XSS attacks
- [ ] ทดสอบกับ Issues ที่มี Markdown ตัวอย่างอย่างน้อย 10 รูปแบบและแสดงผลถูกต้องทั้งหมด
- [ ] ทดสอบกับ Issues ที่มี plain text (ไม่มี Markdown) และแสดงผลปกติไม่เสีย
- [ ] Performance: การ render ไม่ทำให้หน้าโหลดช้าเกิน 200ms เมื่อเทียบกับเดิม
- [ ] ทดสอบบน browsers หลัก (Chrome, Firefox, Safari, Edge) และแสดงผลสม่ำเสมอ
- [ ] มี unit tests สำหรับ Markdown rendering logic
- [ ] อัพเดท documentation สำหรับผู้ใช้เกี่ยวกับการใช้ Markdown ใน Issues

## 5. ระดับความเสี่ยง

**ระดับ: กลาง**

### เหตุผล:

**ปัจจัยที่เพิ่มความเสี่ยง:**
- **Security concerns** — การ render user-generated content