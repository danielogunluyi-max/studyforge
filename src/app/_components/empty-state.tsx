import Link from "next/link";
import { Button } from "~/app/_components/button";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
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
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        {icon ?? (
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 9.75h4.5m-4.5 4.5h4.5M7.5 3.75h9A2.25 2.25 0 0118.75 6v12A2.25 2.25 0 0116.5 20.25h-9A2.25 2.25 0 015.25 18V6A2.25 2.25 0 017.5 3.75z" />
          </svg>
        )}
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mb-6 text-gray-600 leading-relaxed">{description}</p>
      
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
