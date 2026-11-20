export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const segmentLabels: Record<string, string> = {
  dashboard: 'แดชบอร์ด',
  issues: 'เรื่อง',
  new: 'สร้างใหม่',
  intent: 'Intent',
  spec: 'Spec',
  plan: 'แผนการแก้โค้ด',
  releases: 'Releases',
};

export function generateBreadcrumbs(
  pathname: string,
  dynamicLabels?: Record<string, string>,
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: 'หน้าแรก', href: '/dashboard' }];

  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const isLast = i === segments.length - 1;

    const label =
      dynamicLabels?.[segment] ??
      segmentLabels[segment] ??
      (segment.match(/^[0-9a-f-]{36}$/) ? dynamicLabels?.[currentPath] ?? segment : segment);

    items.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return items;
}
