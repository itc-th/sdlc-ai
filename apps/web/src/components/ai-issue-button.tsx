'use client';

import { useState } from 'react';

export function AiIssueButton() {
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [description, setDescription] = useState('');

  async function handleGenerate() {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/draft-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? 'เกิดข้อผิดพลาด');
        return;
      }
      const data = await res.json();

      const titleInput = document.getElementById('title') as HTMLInputElement | null;
      const bodyTextarea = document.getElementById('body') as HTMLTextAreaElement | null;
      const typeSelect = document.getElementById('type') as HTMLSelectElement | null;

      if (titleInput && data.title) {
        titleInput.value = data.title;
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (bodyTextarea && data.body) {
        bodyTextarea.value = data.body;
        bodyTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (typeSelect && data.type) {
        const validTypes = ['feature', 'bug', 'data_fix'];
        if (validTypes.includes(data.type)) {
          typeSelect.value = data.type;
          typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      setShowPrompt(false);
      setDescription('');
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  if (!showPrompt) {
    return (
      <button
        type="button"
        onClick={() => setShowPrompt(true)}
        className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
      >
        ให้ AI สร้าง Issue
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <label htmlFor="ai-desc" className="mb-1 block text-sm font-medium text-purple-800">
        อธิบายสิ่งที่ต้องการสั้น ๆ
      </label>
      <textarea
        id="ai-desc"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-3 w-full rounded border px-3 py-2 text-sm"
        placeholder="เช่น ระบบยังไม่มีหน้า dashboard สำหรับดูสถิติ issue"
        disabled={loading}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !description.trim()}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? 'กำลังสร้าง...' : 'สร้าง'}
        </button>
        <button
          type="button"
          onClick={() => { setShowPrompt(false); setDescription(''); }}
          disabled={loading}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
