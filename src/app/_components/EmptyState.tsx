import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  buttonText,
  onButtonClick,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Icon className="h-10 w-10 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {buttonText && onButtonClick && (
        <button
          onClick={onButtonClick}
          className="rounded-lg bg-[var(--accent-500)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-600)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-500)] focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}
