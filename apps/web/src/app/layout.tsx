import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SDLC-AI',
  description: 'ระบบบริหารงานทีมพัฒนาแบบ AI-native SDLC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
