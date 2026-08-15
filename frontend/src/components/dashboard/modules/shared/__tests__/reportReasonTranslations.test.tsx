/**
 * Dôvody nahlásenia musia ísť cez t() vo VŠETKÝCH štyroch modaloch.
 *
 * `t` je tu zámerne mockované tak, aby vracalo hodnotu odvodenú z KĽÚČA, nie
 * fallback. Ostatné testy modalov mockujú `t` ako „vráť fallback", takže by
 * natvrdo zapísaný slovenský text neodhalili – presne tak sa pôvodná chyba
 * dostala do dvoch z nich.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ReportUserModal } from '../../profile/ReportUserModal';
import { ReportReviewModal } from '../../reviews/ReportReviewModal';
import FeedPostReportModal from '../../feed/FeedPostReportModal';
import { ReportPhotoModal } from '../ReportPhotoModal';

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn().mockResolvedValue({ data: {} }) },
  endpoints: {
    users: { report: (id: number) => `/auth/users/${id}/report/` },
    reviews: { report: (id: number) => `/auth/reviews/${id}/report/` },
  },
}));

jest.mock('@/lib/feedApi', () => ({ reportFeedPost: jest.fn() }));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

// Prekladom je samotný kľúč – text z fallbacku by sa tak hneď prezradil.
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => `##${key}##`, locale: 'sk' }),
}));

/** Slovenské znenia, ktoré boli natvrdo v zozname dôvodov. */
const HARDCODED_SK = [
  'Nevhodné správanie',
  'Falošný profil',
  'Nevhodný obsah',
  'Falošná recenzia',
  'Spam',
  'Iné',
];

/** Vlastný dropdown ukáže možnosti až po otvorení; feed modal ich má hneď. */
async function openDropdownIfPresent() {
  const trigger = screen.queryByLabelText('##reviews.reportReason##');
  if (trigger) await userEvent.click(trigger);
}

function expectAllReasonsTranslated(prefix: string, expected: string[]) {
  expected.forEach((key) => {
    expect(screen.getAllByText(`##${prefix}.${key}##`).length).toBeGreaterThan(0);
  });
  HARDCODED_SK.forEach((label) => {
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  });
}

it('translates every reason in the user report modal', async () => {
  render(<ReportUserModal open onClose={jest.fn()} userId={7} />);
  await openDropdownIfPresent();

  expectAllReasonsTranslated('profile', [
    'reportReasonInappropriate',
    'reportReasonSpam',
    'reportReasonFake',
    'reportReasonOther',
  ]);
});

it('translates every reason in the review report modal', async () => {
  render(<ReportReviewModal open onClose={jest.fn()} reviewId={3} />);
  await openDropdownIfPresent();

  expectAllReasonsTranslated('reviews', [
    'reportReasonInappropriate',
    'reportReasonSpam',
    'reportReasonFake',
    'reportReasonOther',
  ]);
});

it('translates every reason in the feed post report modal', () => {
  render(<FeedPostReportModal open onClose={jest.fn()} postId={5} />);

  expectAllReasonsTranslated('feed', [
    'reportReasonInappropriate',
    'reportReasonSpam',
    'reportReasonHarassment',
    'reportReasonOther',
  ]);
});

it('translates every reason in the photo report modal', async () => {
  render(
    <ReportPhotoModal
      open
      onClose={jest.fn()}
      target={{ type: 'offer_image', skillId: 1, imageId: 2 }}
    />,
  );
  await openDropdownIfPresent();

  expectAllReasonsTranslated('skills', [
    'reportPhotoReasonInappropriate',
    'reportPhotoReasonSpam',
    'reportPhotoReasonFake',
    'reportPhotoReasonOther',
  ]);
});
