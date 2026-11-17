import type { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'SDLC-AI',
  description: 'ระบบบริหารงานทีมพัฒนาแบบ AI-native SDLC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
