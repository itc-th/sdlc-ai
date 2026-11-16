import Image from 'next/image';
import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = session.user as { name?: string | null; email?: string | null; image?: string | null; role?: string };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">SDLC-AI</h1>
      <p className="text-lg text-gray-600">
        ระบบบริหารงานทีมพัฒนาแบบ AI-native SDLC
      </p>
      <div className="mt-6 flex flex-col items-center gap-2">
        {user.image && (
          <Image
            src={user.image}
            alt={user.name ?? ''}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
        {user.role && (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
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
            className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
    </main>
  );
}
