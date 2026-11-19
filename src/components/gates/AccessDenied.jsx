import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDenied({
  title = 'Access denied',
  message = 'Your role does not include permission for this page. Ask the owner if you think that is wrong.',
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-white/70 px-6 py-16 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DB2777]/10 text-[#BE185D]">
        <ShieldAlert className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-heading text-xl font-bold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to home
      </Link>
    </div>
  );
}