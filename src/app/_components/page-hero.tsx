import React from "react";

type PageHeroProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export function PageHero({ title, description, actions }: PageHeroProps) {
  return (
    <header className="mb-7 border-b border-[var(--border-subtle)] pb-5 md:mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4 md:gap-5">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-white md:text-[30px]">{title}</h1>
          <p className="mt-1.5 max-w-3xl text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
        {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}
