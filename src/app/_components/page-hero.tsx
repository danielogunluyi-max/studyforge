import React from "react";

type PageHeroProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export function PageHero({ title, description, actions }: PageHeroProps) {
  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-slate-700/80 bg-gradient-to-br from-[#07102a] via-[#0f1737] to-[#2a1243] p-6 shadow-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-300">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
