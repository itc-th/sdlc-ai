'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function LoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevUrl = useRef(pathname + searchParams.toString());
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const startLoading = useCallback(() => {
    setLoading(true);
    setProgress(20);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(timerRef.current);
          return 90;
        }
        return p + 10;
      });
    }, 150);
  }, []);

  const completeLoading = useCallback(() => {
    clearInterval(timerRef.current);
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 200);
  }, []);

  useEffect(() => {
    const currentUrl = pathname + searchParams.toString();
    if (prevUrl.current !== currentUrl) {
      completeLoading();
      prevUrl.current = currentUrl;
    }
  }, [pathname, searchParams, completeLoading]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http')) return;
      const currentUrl = pathname + searchParams.toString();
      if (href !== currentUrl) {
        startLoading();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname, searchParams, startLoading]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5">
      <div
        className="h-full bg-primary-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
