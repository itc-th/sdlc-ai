export type LoadingSize = 'sm' | 'md' | 'lg';

export interface LoadingSpinnerProps {
  size?: LoadingSize;
  className?: string;
}

export interface LoadingSkeletonProps {
  variant?: 'row' | 'card' | 'text' | 'circle';
  count?: number;
  className?: string;
}
