export const BUG_REPORT_DIALOG_REQUEST_EVENT = 'svaply:bug-report-dialog-request';

export function requestBugReportDialog(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BUG_REPORT_DIALOG_REQUEST_EVENT));
}
