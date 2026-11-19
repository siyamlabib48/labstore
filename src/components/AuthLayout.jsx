import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { LAB_KEYS, LABS } from '@/lib/labs';

const PERKS = [
  'Upload work once — private, per-student storage',
  'Talk inside your batch room and your own lab room',
  'Track milestones and climb the lab leaderboard',
];

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-foreground px-12 py-14 text-background lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-[#6366F1]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-[#DB2777]/25 blur-3xl" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background font-heading text-sm font-bold text-foreground">
              LS
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">Labstore</span>
          </Link>

          <h2 className="mt-14 max-w-sm font-heading text-4xl font-bold leading-[1.05] tracking-tight">
            Every lab, every project, in one place.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/70">
            The shared cloud for your academy — uploads, lab rooms, notices and ranks, all in one calm
            place.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {LAB_KEYS.map((key) => (
              <span
                key={key}
                className="rounded-full border border-background/20 px-3 py-1 text-[11px] font-semibold text-background/80"
              >
                {LABS[key].label}
              </span>
            ))}
          </div>
        </div>

        <ul className="relative mt-12 space-y-3">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-sm text-background/75">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-background/15">
                <Check className="h-2.5 w-2.5" />
              </span>
              {perk}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground font-heading text-[11px] font-bold text-background">
              LS
            </span>
            <span className="font-heading text-base font-bold tracking-tight">Labstore</span>
          </Link>

          <div className="mb-7">
            {Icon && (
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
            )}
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.45)] sm:p-8">
            {children}
          </div>

          {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
        </div>
      </main>
    </div>
  );
}