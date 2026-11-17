import { signIn } from '@/lib/auth';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface-50">
      <div className="flex flex-col items-center gap-2">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-2xl font-bold text-white shadow-lg">S</span>
        <h1 className="text-3xl font-bold text-surface-900">SDLC-AI</h1>
        <p className="text-surface-700">ระบบบริหารงานทีมพัฒนาแบบ AI-native</p>
      </div>
      <div className="flex flex-col gap-3">
        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo: '/' });
          }}
        >
          <button
            type="submit"
            className="w-64 rounded-lg bg-surface-900 px-4 py-3 text-white font-medium hover:bg-surface-800 transition-colors"
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
            className="w-64 rounded-lg bg-primary-600 px-4 py-3 text-white font-medium hover:bg-primary-500 transition-colors"
          >
            Login with Google
          </button>
        </form>
      </div>
    </main>
  );
}
