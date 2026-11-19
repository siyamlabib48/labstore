import React, { useState } from 'react';
import { ChevronDown, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TEST_ACCOUNTS } from '@/lib/testAccounts';
import { cn } from '@/lib/utils';

// Dev-only cheat sheet: pick a role, the button only pre-fills the email field.
// The password is still typed by hand, so a real session is created.
export default function TestingHelpers({ onFill }) {
  const [open, setOpen] = useState(false);

  const rows = TEST_ACCOUNTS.filter((a) => a.email);

  return (
    <div className="mb-5 rounded-xl border border-dashed border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-xs font-semibold text-muted-foreground">
          🔧 Testing Helpers (dev only)
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-dashed border-border px-3 py-3">
          {rows.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              No test accounts set up yet. Create one account per role, then add the
              emails in <span className="font-mono">src/lib/testAccounts.js</span>.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-1.5 font-semibold">Role</th>
                  <th className="pb-1.5 font-semibold">Email to sign in as</th>
                  <th className="pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((account) => (
                  <tr key={account.role} className="border-t border-border/60">
                    <td className="py-1.5 pr-2 font-medium text-foreground">{account.role}</td>
                    <td className="py-1.5 pr-2 font-mono text-[11px] text-muted-foreground">
                      {account.email}
                    </td>
                    <td className="py-1 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => onFill(account.email)}
                      >
                        <Wand2 className="mr-1 h-3 w-3" />
                        Fill
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Fill only sets the email. Type that account's real password, then log in.
          </p>
        </div>
      )}
    </div>
  );
}