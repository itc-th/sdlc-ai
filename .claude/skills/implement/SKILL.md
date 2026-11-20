---
name: implement
description: เขียนโค้ดตาม plan ที่อนุมัติแล้ว สร้าง branch, ทดสอบ, commit, push, เปิด PR อัตโนมัติ ใช้เมื่อผู้ใช้พิมพ์ /implement <เลข GitHub issue> หรือขอให้ implement งาน
---

# Implement จาก approved plan

รับเลข **GitHub issue** เป็น argument เช่น `/implement 26` ถ้าไม่ได้ให้เลขมา ให้ถามก่อน

## ขั้นตอน

### 1. ดึงโค้ดล่าสุด

```bash
git checkout main
git pull origin main
```

ต้อง pull ก่อนเสมอ เพื่อให้ได้เอกสารและโค้ดล่าสุดจาก remote

### 2. อ่านเอกสาร

```bash
# หา folder ของ issue
ls docs/intents/ | grep "<เลข issue>"
```

อ่านไฟล์ทั้ง 3 ใน `docs/intents/<year>-<เลข issue>-<slug>/`:
- `intent.md` — เป้าหมาย ทำอะไร ทำไม
- `spec.md` — รายละเอียดทางเทคนิค ข้อกำหนด
- `plan.md` — แผนแก้โค้ด ไฟล์ไหน แก้อย่างไร (**ทำตามนี้เป็นหลัก**)

ถ้าไม่มี plan.md หรือเอกสารไม่ครบ → **หยุด** แจ้งผู้ใช้ว่ายังไม่พร้อม implement

### 3. สำรวจ codebase

ก่อนเขียนโค้ด ให้:
- อ่าน `docs/repo-map.md` เพื่อเข้าใจโครงสร้าง
- อ่านไฟล์ที่ plan ระบุว่าต้องแก้ ทุกไฟล์
- ตรวจสอบว่า framework/library มี feature ที่ต้องการอยู่แล้วหรือไม่
- ถ้า plan ไม่ตรงกับโค้ดจริง (เช่น ไฟล์ไม่มี, ใช้ feature ที่มีอยู่แล้ว) → **แจ้งผู้ใช้** ว่า plan ต้องปรับ พร้อมเสนอแนว ก่อนเริ่มเขียน

### 4. สร้าง branch

```bash
git checkout main
git pull origin main
git checkout -b <ชื่อ folder ใน docs/intents/>
# เช่น: git checkout -b 2026-26-client-side-navigation
```

ชื่อ branch **ต้องตรงกับชื่อ folder** ใน docs/intents/

### 5. เขียนโค้ด

- ทำตาม plan.md เป็นหลัก
- อ้างอิง spec.md สำหรับข้อกำหนดและเงื่อนไข
- ถ้า plan กว้างเกินไป ให้ดูโค้ดจริงแล้วตัดสินใจ
- ถ้าทำตาม plan ไม่ได้ → **หยุด** รายงานปัญหา ห้ามเปลี่ยนขอบเขตเอง

### 6. ทดสอบ

ต้องผ่าน **ทุกข้อ** ก่อน commit:

```bash
pnpm build        # ต้องผ่าน ไม่มี error
pnpm lint         # ต้องผ่าน ไม่มี warning ใหม่
pnpm test         # ต้องผ่าน (ถ้ามี test)
```

ถ้า build ไม่ผ่าน → แก้จนผ่าน
ถ้า lint ไม่ผ่าน → แก้จนผ่าน
ถ้า test fail → แก้จนผ่าน

### 7. ตรวจสอบก่อน commit

- [ ] ไม่มี secret, token, รหัสผ่านในโค้ด
- [ ] ไม่มีข้อมูลส่วนบุคคลจาก issue ในโค้ด
- [ ] ไม่เพิ่ม dependency ใหม่โดยไม่มีเหตุผล
- [ ] อัปเดต `docs/repo-map.md` ถ้าโครงสร้างเปลี่ยน
- [ ] การกระทำสำคัญถูกบันทึกใน audit log (ถ้าเกี่ยวข้อง)

### 8. Commit และ Push

```bash
git add <ไฟล์ที่แก้ เฉพาะไฟล์ที่เกี่ยวข้อง>
git commit -m "feat: <สรุปสั้นๆ> (#<เลข issue>)"
git push -u origin <ชื่อ branch>
```

Commit message format:
- `feat:` — feature ใหม่
- `fix:` — แก้ bug
- `refactor:` — ปรับโครงสร้างโค้ด
- `docs:` — แก้เอกสาร

### 9. เปิด Pull Request

```bash
gh pr create \
  --title "feat: <สรุปสั้นๆ>" \
  --body "$(cat <<'EOF'
## Summary
<สรุปสิ่งที่เปลี่ยน 1-3 บรรทัด>

## References
- Closes #<เลข issue>
- Plan: docs/intents/<folder>/plan.md
- Spec: docs/intents/<folder>/spec.md

## Checklist
- [ ] `pnpm build` ผ่าน
- [ ] `pnpm lint` ผ่าน
- [ ] `pnpm test` ผ่าน
- [ ] ไม่มี secret/token ในโค้ด
- [ ] อัปเดต repo-map.md (ถ้าโครงสร้างเปลี่ยน)
EOF
)"
```

### 10. รายงานผล

สรุปให้ผู้ใช้:
- PR URL
- ไฟล์ที่แก้ไข
- ผลการทดสอบ (build/lint/test)
- สิ่งที่เบี่ยงเบนจาก plan (ถ้ามี)

## ข้อห้าม

- ห้าม push เข้า `main` โดยตรง
- ห้าม merge PR (เป็นหน้าที่ของ reviewer)
- ห้าม `--force` push
- ห้ามแก้ migration ที่ merge แล้ว
- ห้ามข้ามขั้นตอนทดสอบ (build/lint/test)
- ถ้าทำตาม plan ไม่ได้ ห้ามเปลี่ยนขอบเขตเอง ให้หยุดและรายงาน
