import Link from 'next/link';
import type { BreadcrumbItem } from '@/lib/breadcrumbs';

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-surface-300">/</span>}
          {item.href ? (
            <Link href={item.href} className="text-primary-600 hover:text-primary-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-surface-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
