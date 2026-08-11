/**
 * Vnorený „zdieľať na Nástenku" dialóg vnútri OfferShareModal.
 *
 * React portály prebublávajú udalosti cez REACT strom, nie cez DOM – klik
 * v portáli vnoreného dialógu sa preto dostane aj k vonkajšiemu modalu.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { OfferShareModal } from './OfferShareModal';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,x') },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

jest.mock('@/lib/feedApi', () => ({ shareOfferToFeed: jest.fn() }));

jest.mock('../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div data-testid="user-picker" />,
}));

jest.mock('../messages/messagingApi', () => ({
  sendOfferShare: jest.fn(),
  getMessagingErrorMessage: () => 'chyba',
}));

jest.mock('../messages/messagesEvents', () => ({
  requestConversationsRefresh: jest.fn(),
  suppressPassiveMessagingRefresh: jest.fn(),
}));

jest.mock('../feed/DesktopEmojiPickerButton', () => ({}), { virtual: true });
jest.mock('../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

const offer = { id: 5, title: 'Moja ponuka', imageUrl: null, location: 'Bratislava' };

function renderModal(onClose = jest.fn()) {
  render(
    <OfferShareModal
      open
      onClose={onClose}
      offerUrl="https://svaply.test/offer/5"
      offer={offer}
    />,
  );
  return onClose;
}

describe('OfferShareModal – vnorený dialóg Nástenky', () => {
  it('opens the board dialog from the unlocked option', async () => {
    renderModal();

    await userEvent.click(screen.getByTestId('offer-share-to-board'));

    expect(await screen.findByTestId('feed-share-modal')).toBeInTheDocument();
  });

  it('closes when the backdrop itself is clicked', async () => {
    const onClose = renderModal();

    // Pozadie je rodič panela – klik naň musí modal zavrieť (pôvodné správanie).
    const backdrop = screen.getByRole('dialog');
    await userEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when a click merely bubbles up from inside', async () => {
    const onClose = renderModal();

    // Ľubovoľné prvky vo vnútri – klik na ne prebublá až na pozadie, ale
    // zavrieť smie LEN klik priamo naň.
    await userEvent.click(document.getElementById('offer-share-modal-title')!);
    await userEvent.click(screen.getByTestId('offer-share-to-board'));
    await userEvent.click(screen.getByText('Send in message'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes only the nested dialog when its backdrop is clicked', async () => {
    const onClose = renderModal();

    await userEvent.click(screen.getByTestId('offer-share-to-board'));
    const nested = await screen.findByTestId('feed-share-modal');

    await userEvent.click(nested);

    // Vnorený dialóg sa zavrie…
    await waitFor(() =>
      expect(screen.queryByTestId('feed-share-modal')).not.toBeInTheDocument(),
    );
    // …ale materský modal MUSÍ zostať otvorený.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('offer-share-to-board')).toBeInTheDocument();
  });
});
