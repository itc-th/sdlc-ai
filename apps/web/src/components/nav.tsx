import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';

export async function Nav() {
  const session = await auth();
  const user = session?.user as { name?: string | null; image?: string | null; role?: string } | undefined;

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            SDLC-AI
          </Link>
          {session && (
            <>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/issues" className="text-sm text-gray-600 hover:text-gray-900">
                Issues
              </Link>
            </>
          )}
        </div>
        {session && user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.name}</span>
            {user.role && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                {user.role}
              </span>
            )}
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/login' });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}
