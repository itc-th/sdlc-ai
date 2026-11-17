import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/issues', label: 'Issues', icon: '📋' },
  { href: '/issues/new', label: 'สร้างเรื่องใหม่', icon: '➕' },
];

export async function Sidebar() {
  const session = await auth();
  const user = session?.user as { name?: string | null; role?: string } | undefined;

  if (!session) return null;

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-surface-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-surface-200 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">S</span>
        <Link href="/" className="text-lg font-bold text-surface-900">
          SDLC-AI
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-surface-300">เมนู</p>
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-surface-200 px-4 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {user.name?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-surface-900">{user.name}</p>
              {user.role && (
                <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                  {user.role}
                </span>
              )}
            </div>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="text-xs text-surface-300 hover:text-danger-600 transition-colors"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
