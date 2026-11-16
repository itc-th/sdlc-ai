# SDLC-AI 

ระบบบริหารงานทีมพัฒนาแบบ AI-native SDLC: รับเรื่อง คัดแยก วิเคราะห์ ออกแบบ อนุมัติ และติดตามงานพัฒนา โดยใช้ GitHub เป็นที่เก็บงานฝั่งพัฒนา

repo นี้เป็นโปรเจคต้นแบบ: งานพัฒนา SDLC 
ทุกชิ้นเดินตามกระบวนการ intent → spec → plan → PR ที่ระบบนี้จะรองรับ

## เริ่มอ่านที่ไหน

- `CLAUDE.md` กติกาที่คนและ agent ใช้ร่วมกัน
- `docs/repo-map.md` แผนที่ระบบย่อยและการพึ่งพา
- `docs/process.md` ขั้นตอนทำงานหนึ่งเรื่องตั้งแต่ต้นจนปิด
- `docs/policies/review-checklist.md` รายการตรวจ spec และ PR
- `docs/intents/TEMPLATE.md`, `docs/design/SPEC-TEMPLATE.md` แบบฟอร์ม

## สถานะ

ระยะ 0 (เตรียม repo): มีเอกสารและแบบฟอร์ม ยังไม่มีโค้ดของแอป

## ตั้งค่าครั้งแรก

    gh label create "type:feature"; gh label create "type:bug"; gh label create "type:data-fix"
    gh label create "status:triage"; gh label create "status:intent-draft"; gh label create "status:intent-approved"
    gh label create "risk:low"; gh label create "risk:medium"; gh label create "risk:high"

จากนั้นตั้ง branch protection ของ `main`: ห้าม push ตรง ต้องมีผู้อนุมัติ PR อย่างน้อย 1 คนที่ไม่ใช่ผู้เปิด PR
