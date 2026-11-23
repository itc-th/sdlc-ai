import { renderMarkdown } from '@/lib/markdown';

interface MarkdownContentProps {
  content: string | null | undefined;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const renderedContent = renderMarkdown(content);

  if (!renderedContent) {
    return <p className="text-sm text-gray-500 italic">(ไม่มีเนื้อหา)</p>;
  }

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
