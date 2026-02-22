import Link from "next/link";
import { Button } from "~/app/_components/button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  secondaryActionLabel,
  secondaryActionHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mb-6 text-gray-600">{description}</p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {actionLabel && (
            <>
              {actionHref ? (
                <Button href={actionHref} size="md" className="w-full sm:w-auto">
                  {actionLabel}
                </Button>
              ) : actionOnClick ? (
                <Button
                  onClick={actionOnClick}
                  size="md"
                  className="w-full sm:w-auto"
                >
                  {actionLabel}
                </Button>
              ) : null}
            </>
          )}
          
          {secondaryActionLabel && secondaryActionHref && (
            <Button href={secondaryActionHref} variant="secondary" size="md" className="w-full sm:w-auto">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
