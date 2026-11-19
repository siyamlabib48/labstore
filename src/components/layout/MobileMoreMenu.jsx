import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function MobileMoreMenu({ open, onOpenChange, items }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 lg:hidden"
      >
        <SheetHeader className="pb-1">
          <SheetTitle className="text-base">Everything else</SheetTitle>
        </SheetHeader>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => onOpenChange(false)}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-[11px] font-semibold transition-colors',
                    isActive
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border/70 bg-white text-foreground/80 hover:bg-muted'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="w-full truncate text-center">{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DB2777] px-1 text-[9px] font-bold leading-none text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}