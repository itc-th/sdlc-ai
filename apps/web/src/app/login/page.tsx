import { signIn } from '@/lib/auth';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">SDLC-AI</h1>
      <p className="text-gray-600">เข้าสู่ระบบเพื่อดำเนินการต่อ</p>
      <div className="flex flex-col gap-3 mt-4">
        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo: '/' });
          }}
        >
          <button
            type="submit"
            className="w-64 rounded-lg bg-gray-900 px-4 py-3 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Login with GitHub
          </button>
        </form>
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/' });
          }}
        >
          <button
            type="submit"
            className="w-64 rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-500 transition-colors"
          >
            Login with Google
          </button>
        </form>
      </div>
    </main>
  );
}
