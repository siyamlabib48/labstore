import React from 'react';
import { AlertTriangle } from 'lucide-react';
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

export default function RemoveMemberDialog({ member, onCancel, onConfirm }) {
  return (
    <AlertDialog open={!!member} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 font-heading">
            <AlertTriangle className="h-4 w-4 text-[#B45309]" />
            Owner override on student removal
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are removing <span className="font-semibold">{member?.full_name || member?.email}</span>{' '}
            from {member?.lab ? `lab ${member.lab}` : 'their lab'} and their batch. Their account keeps
            existing but loses batch access until someone places them again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remove member</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}