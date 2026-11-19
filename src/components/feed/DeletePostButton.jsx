import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

// Deleting a post removes it for the whole batch, so it always asks first and
// reports back when the server refuses instead of failing silently.
export default function DeletePostButton({ onDelete, isMine = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onDelete();
      setOpen(false);
      toast({ title: 'Post deleted' });
    } catch (err) {
      toast({
        title: 'Post could not be deleted',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    }
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Delete post"
        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isMine ? 'Delete your post?' : 'Remove this post?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isMine
                ? 'It disappears from the wall for everyone in the batch, along with its likes, votes and comments. This cannot be undone.'
                : "You are removing a classmate's post from the wall for everyone in the batch. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
              disabled={busy}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}