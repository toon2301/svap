import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

import BugReportDialog from './BugReportDialog';
import BugReportDialogHost from './BugReportDialogHost';
import { requestBugReportDialog } from './bugReportDialogEvents';
import { createBugReport } from './bugReportsApi';

jest.mock('./bugReportsApi', () => ({
  __esModule: true,
  createBugReport: jest.fn(),
}));

const mockedCreateBugReport = createBugReport as jest.Mock;

function fillRequiredFields() {
  fireEvent.click(screen.getByRole('button', { name: 'Vizuálny problém' }));
  fireEvent.change(screen.getByLabelText('Krátky názov'), {
    target: { value: 'Rozbité rozloženie' },
  });
  fireEvent.change(screen.getByLabelText('Čo sa stalo?'), {
    target: { value: 'Karta prekrýva nadpis.' },
  });
}

describe('BugReportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/dashboard/profile/105?private=value');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    document.body.style.overflow = '';
  });

  it('opens from the shared request event', () => {
    render(<BugReportDialogHost />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => requestBugReportDialog());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Nahlásiť problém')).toBeInTheDocument();
  });

  it('validates required fields before calling the backend', () => {
    render(<BugReportDialog onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Odoslať hlásenie' }));

    expect(screen.getByText('Vyber kategóriu problému.')).toBeInTheDocument();
    expect(screen.getByText('Napíš krátky názov problému.')).toBeInTheDocument();
    expect(screen.getByText('Popíš, čo sa stalo.')).toBeInTheDocument();
    expect(mockedCreateBugReport).not.toHaveBeenCalled();
  });

  it('sends trimmed input with safe context and shows the reference', async () => {
    mockedCreateBugReport.mockResolvedValueOnce({
      reference: 'BR-20260730-ABC123',
      status: 'new',
      created_at: '2026-07-30T10:00:00Z',
    });
    render(<BugReportDialog onClose={jest.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Odoslať hlásenie' }));

    await waitFor(() => expect(mockedCreateBugReport).toHaveBeenCalledTimes(1));
    expect(mockedCreateBugReport).toHaveBeenCalledWith({
      category: 'visual',
      title: 'Rozbité rozloženie',
      description: 'Karta prekrýva nadpis.',
      reproduction_steps: '',
      source_screen: 'profile',
      device_type: 'desktop',
      locale: 'sk',
      app_version: '',
      browser: 'Other',
    });
    expect(await screen.findByText('BR-20260730-ABC123')).toBeInTheDocument();
    expect(screen.getByText('Hlásenie bolo odoslané')).toBeInTheDocument();
  });

  it('shows a dedicated rate limit message', async () => {
    mockedCreateBugReport.mockRejectedValueOnce({ response: { status: 429 } });
    render(<BugReportDialog onClose={jest.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Odoslať hlásenie' }));

    expect(
      await screen.findByText('Dosiahol si limit hlásení. Skús to znova neskôr.'),
    ).toBeInTheDocument();
  });

  it('prevents duplicate submissions and cannot close while sending', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    mockedCreateBugReport.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const onClose = jest.fn();
    render(<BugReportDialog onClose={onClose} />);
    fillRequiredFields();

    const submit = screen.getByRole('button', { name: 'Odoslať hlásenie' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockedCreateBugReport).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    resolveRequest?.({
      reference: 'BR-20260730-ONE',
      status: 'new',
      created_at: '2026-07-30T10:00:00Z',
    });
    expect(await screen.findByText('BR-20260730-ONE')).toBeInTheDocument();
  });

  it('asks before discarding entered content', () => {
    const onClose = jest.fn();
    render(<BugReportDialog onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('Krátky názov'), {
      target: { value: 'Rozpísané hlásenie' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Zatvoriť' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Pokračovať v úprave' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Zahodiť' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
