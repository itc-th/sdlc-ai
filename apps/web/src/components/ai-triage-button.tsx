'use client';

import { useState } from 'react';

export function AiTriageButton({ issueId }: { issueId: string }) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setReason(null);
    try {
      const res = await fetch('/api/ai/triage-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? 'เกิดข้อผิดพลาด');
        return;
      }
      const data = await res.json();

      const typeSelect = document.getElementById('type') as HTMLSelectElement | null;
      const riskSelect = document.getElementById('riskLevel') as HTMLSelectElement | null;

      if (typeSelect && data.type) {
        typeSelect.value = data.type;
      }
      if (riskSelect && data.riskLevel) {
        riskSelect.value = data.riskLevel;
      }
      if (data.reason) {
        setReason(data.reason);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
      >
        {loading ? 'กำลังวิเคราะห์...' : 'AI คัดแยก'}
      </button>
      {reason && (
        <p className="mt-2 text-xs text-purple-600">
          AI: {reason}
        </p>
      )}
    </div>
  );
}
