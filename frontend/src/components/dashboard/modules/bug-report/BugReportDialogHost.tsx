'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import BugReportDialog from './BugReportDialog';
import { BUG_REPORT_DIALOG_REQUEST_EVENT } from './bugReportDialogEvents';

export default function BugReportDialogHost() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const openDialog = () => setIsOpen(true);
    window.addEventListener(BUG_REPORT_DIALOG_REQUEST_EVENT, openDialog);
    return () => window.removeEventListener(BUG_REPORT_DIALOG_REQUEST_EVENT, openDialog);
  }, []);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <BugReportDialog onClose={() => setIsOpen(false)} />,
    document.getElementById('app-root') ?? document.body,
  );
}
