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
    <aside className="flex h-screen w-56 flex-shrink-0 flex-col border-r bg-gray-50">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="text-lg font-bold text-gray-900">
          SDLC-AI
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User */}
      {user && (
        <div className="border-t px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{user.name}</span>
            {user.role && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                {user.role}
              </span>
            )}
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
