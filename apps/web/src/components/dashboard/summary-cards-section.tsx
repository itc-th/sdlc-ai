import type { SummaryCardData } from '@/lib/dashboard/types';
import { SummaryCard } from './summary-card';

export function SummaryCardsSection({ cards }: { cards: SummaryCardData[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <SummaryCard key={card.title} data={card} />
      ))}
    </div>
  );
}
