import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReportReviewModal } from '../ReportReviewModal';

const mockPost = jest.fn();

jest.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
  endpoints: {
    reviews: { report: (id: number) => `/auth/reviews/${id}/report/` },
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

describe('ReportReviewModal – dôvod nahlásenia', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: {} });
  });

  it('sends the stable reason code, not the displayed label', async () => {
    render(<ReportReviewModal open onClose={jest.fn()} reviewId={12} />);

    await userEvent.click(screen.getByRole('button', { name: 'Odoslať' }));

    expect(mockPost).toHaveBeenCalledWith('/auth/reviews/12/report/', {
      reason: 'inappropriate',
      description: undefined,
    });
  });

  it('keeps the localized label for display only', async () => {
    render(<ReportReviewModal open onClose={jest.fn()} reviewId={12} />);

    expect(screen.getByText('Nevhodný obsah')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Odoslať' }));

    const [, payload] = mockPost.mock.calls[0];
    expect(payload.reason).toBe('inappropriate');
    expect(payload.reason).not.toBe('Nevhodný obsah');
  });

  it('sends the selected reason code after switching options', async () => {
    render(<ReportReviewModal open onClose={jest.fn()} reviewId={12} />);

    await userEvent.click(screen.getByLabelText('Dôvod'));
    await userEvent.click(screen.getByRole('button', { name: 'Falošná recenzia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Odoslať' }));

    expect(mockPost.mock.calls[0][1].reason).toBe('fake');
  });
});
