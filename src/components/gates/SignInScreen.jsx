import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderOpen, MessagesSquare, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LAB_KEYS, LABS } from '@/lib/labs';

const FEATURES = [
  {
    icon: FolderOpen,
    title: 'One home for your work',
    body: 'Upload documents, designs and live sites into a personal library with 500 MB per student.',
  },
  {
    icon: MessagesSquare,
    title: 'Batch and lab rooms',
    body: 'Talk with everyone in your batch, or keep the conversation inside your own lab.',
  },
  {
    icon: Trophy,
    title: 'See who is shipping',
    body: 'Lab and academy leaderboards, plus progress milestones your teachers can tick off.',
  },
];

export default function SignInScreen() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#6366F1]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-[#DB2777]/10 blur-3xl" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
            <span className="font-heading text-sm font-bold text-background">LS</span>
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">Labstore</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" className="rounded-full text-sm">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild className="rounded-full text-sm">
            <Link to="/register">Create account</Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 lg:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              For students and lab teams
            </span>

            <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.03] tracking-tight sm:text-5xl">
              Your lab&apos;s work, all in one calm place.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Labstore keeps every project, note and conversation from your labs together — so you
              always know what you shipped and what is next.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link to="/login">
                  Log in to your account <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <Link to="/register">Create an account</Link>
              </Button>
            </div>

            <p className="mt-4 max-w-md text-[11px] leading-relaxed text-muted-foreground">
              New here? Signing up creates a pending account — the batch owner approves it and assigns
              your lab group.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              {LAB_KEYS.map((key) => (
                <span
                  key={key}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${LABS[key].chip}`}
                >
                  {LABS[key].label}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-white p-5 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.5)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Inside Labstore
            </p>
            <div className="mt-4 space-y-4">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}