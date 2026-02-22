import Link from "next/link";

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
                <Link
                  href={actionHref}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                >
                  {actionLabel}
                </Link>
              ) : actionOnClick ? (
                <button
                  onClick={actionOnClick}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                >
                  {actionLabel}
                </button>
              ) : null}
            </>
          )}
          
          {secondaryActionLabel && secondaryActionHref && (
            <Link
              href={secondaryActionHref}
              className="w-full rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 sm:w-auto"
            >
              {secondaryActionLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
