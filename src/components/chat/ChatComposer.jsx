import React, { useState } from 'react';
import { AlertCircle, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import usePendingFiles from '@/hooks/usePendingFiles';
import { AttachButton, PendingFileChips } from '@/components/common/PendingFiles';

export default function ChatComposer({ onSend, placeholder, disabled }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const files = usePendingFiles(setError);

  const canSend = !!body.trim() || files.pending.length > 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSend || sending) return;
    setSending(true);
    setError('');
    try {
      const attachments = await files.uploadAll();
      await onSend(body.trim(), attachments);
      setBody('');
      files.clear();
    } catch (err) {
      setError(err.message || 'Message could not be sent');
    }
    setSending(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit(event);
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-border/70 bg-white p-3">
      {error && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      {files.pending.length > 0 && (
        <div className="mb-2">
          <PendingFileChips pending={files.pending} onRemove={files.removeAt} />
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="pb-1">
          <AttachButton onFiles={files.addFiles} disabled={disabled || sending} />
        </div>
        <Textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setError('');
          }}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={1000}
          disabled={disabled}
          placeholder={placeholder}
          className="min-h-[42px] max-h-32 resize-none rounded-2xl"
        />
        <Button
          type="submit"
          size="icon"
          className="h-[42px] w-[42px] shrink-0 rounded-full"
          disabled={disabled || sending || !canSend}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
    </form>
  );
}
