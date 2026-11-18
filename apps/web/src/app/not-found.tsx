import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-surface-300">404</h1>
        <p className="mt-4 text-lg text-surface-700">ไม่พบหน้าที่ต้องการ</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          กลับหน้า Dashboard
        </Link>
      </div>
    </main>
  );
}
