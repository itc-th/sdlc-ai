import { Breadcrumb } from './breadcrumb';
import { PageHeader } from './page-header';
import type { BreadcrumbItem } from '@/lib/breadcrumbs';

export function FormLayout({
  breadcrumbs,
  title,
  description,
  actions,
  children,
}: {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="px-6 py-8 md:px-8">
      {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </main>
  );
}
