'use client';

import { useState } from 'react';

export function AiDraftButton({
  endpoint,
  payload,
  textareaId,
}: {
  endpoint: string;
  payload: Record<string, string>;
  textareaId: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? 'เกิดข้อผิดพลาด');
        return;
      }
      const data = await res.json();
      const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
      if (textarea && data.content) {
        textarea.value = data.content;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
    >
      {loading ? 'กำลังร่าง...' : 'ให้ AI ร่าง'}
    </button>
  );
}
