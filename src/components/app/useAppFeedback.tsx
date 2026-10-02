import { useEffect, useRef, useState } from 'react';
import { ActionDialog, ActionDialogRequest, ActionDialogResult } from '../shared/ActionDialog';
import { FeedbackToast, FeedbackToastRequest } from '../shared/FeedbackToast';

export function useAppFeedback() {
  const [actionDialog, setActionDialog] = useState<ActionDialogRequest | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<(FeedbackToastRequest & { id: number }) | null>(null);
  const actionDialogResolverRef = useRef<((result: ActionDialogResult) => void) | null>(null);

  useEffect(() => {
    if (!feedbackToast) return undefined;
    const timeout = window.setTimeout(() => setFeedbackToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [feedbackToast]);

  function openActionDialog(dialog: ActionDialogRequest): Promise<ActionDialogResult> {
    if (actionDialogResolverRef.current) {
      actionDialogResolverRef.current(null);
      actionDialogResolverRef.current = null;
    }

    setActionDialog(dialog);
    return new Promise((resolve) => {
      actionDialogResolverRef.current = resolve;
    });
  }

  function resolveActionDialog(result: ActionDialogResult) {
    actionDialogResolverRef.current?.(result);
    actionDialogResolverRef.current = null;
    setActionDialog(null);
  }

  async function confirmAction(dialog: ActionDialogRequest) {
    return await openActionDialog(dialog) === true;
  }

  async function chooseAction(dialog: ActionDialogRequest) {
    const result = await openActionDialog(dialog);
    return typeof result === 'string' ? result : null;
  }

  async function showActionMessage(dialog: ActionDialogRequest) {
    await openActionDialog({
      ...dialog,
      confirmLabel: dialog.confirmLabel ?? 'Entendi',
      hideCancel: true,
    });
  }

  function showFeedback(toast: FeedbackToastRequest) {
    setFeedbackToast({ ...toast, id: Date.now() });
  }

  const feedbackOverlays = (
    <>
      {actionDialog ? <ActionDialog dialog={actionDialog} onResolve={resolveActionDialog} /> : null}
      {feedbackToast ? <FeedbackToast toast={feedbackToast} onClose={() => setFeedbackToast(null)} /> : null}
    </>
  );

  return {
    chooseAction,
    confirmAction,
    feedbackOverlays,
    showActionMessage,
    showFeedback,
  };
}
