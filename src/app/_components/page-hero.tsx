import React from "react";

type PageHeroProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export function PageHero({ title, description, actions }: PageHeroProps) {
  return (
    <header className="mb-8 border-b border-[var(--border-subtle)] pb-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold text-white">{title}</h1>
          <p className="mt-1 text-[14px] text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
