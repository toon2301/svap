/**
 * Hlavička rozpísanej konverzácie (desktop): meno a avatar druhej strany vedú na jej profil.
 *
 * Profil sa otvára eventom `goToUserProfile` (slug má prednosť, inak ID). Zmazaný účet
 * profil nemá, preto sa naň nedá kliknúť.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DraftConversationHeader } from './DraftConversationHeader';

type Props = Partial<React.ComponentProps<typeof DraftConversationHeader>>;

const renderHeader = (props: Props = {}) =>
  render(
    <DraftConversationHeader
      avatarUrl="https://cdn.example/anna.png"
      targetUserName="Anna Nováková"
      targetUserId={42}
      targetUserSlug="anna"
      openPeerProfileLabel="Otvoriť profil používateľa"
      {...props}
    />,
  );

/** Identifikátory všetkých `goToUserProfile` eventov, ktoré od tohto volania prišli. */
function recordProfileEvents() {
  const identifiers: unknown[] = [];
  const listener = (event: Event) => {
    identifiers.push((event as CustomEvent<{ identifier?: unknown }>).detail?.identifier);
  };
  window.addEventListener('goToUserProfile', listener);
  return { identifiers, stop: () => window.removeEventListener('goToUserProfile', listener) };
}

describe('DraftConversationHeader', () => {
  it('shows the name and the avatar of the other side', () => {
    renderHeader();

    expect(screen.getByText('Anna Nováková')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Anna Nováková' })).toHaveAttribute(
      'src',
      'https://cdn.example/anna.png',
    );
  });

  it('shows the first letter when there is no avatar', () => {
    renderHeader({ avatarUrl: null });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('is a labelled button that opens the profile by slug', () => {
    const { identifiers, stop } = recordProfileEvents();
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Otvoriť profil používateľa' }));
    stop();

    expect(identifiers).toEqual(['anna']);
  });

  it('trims the slug before using it', () => {
    const { identifiers, stop } = recordProfileEvents();
    renderHeader({ targetUserSlug: '  anna  ' });

    fireEvent.click(screen.getByTestId('draft-conversation-header-trigger'));
    stop();

    expect(identifiers).toEqual(['anna']);
  });

  it.each([[null], [''], ['   ']])('falls back to the user id when the slug is %j', (slug) => {
    const { identifiers, stop } = recordProfileEvents();
    renderHeader({ targetUserSlug: slug });

    fireEvent.click(screen.getByTestId('draft-conversation-header-trigger'));
    stop();

    expect(identifiers).toEqual(['42']);
  });

  it('is disabled and sends nothing when there is neither a slug nor an id', () => {
    const { identifiers, stop } = recordProfileEvents();
    renderHeader({ targetUserId: null, targetUserSlug: null });
    const trigger = screen.getByTestId('draft-conversation-header-trigger');

    fireEvent.click(trigger);
    stop();

    expect(trigger).toBeDisabled();
    expect(identifiers).toEqual([]);
  });

  it('is disabled and sends nothing for a deleted account', () => {
    const { identifiers, stop } = recordProfileEvents();
    renderHeader({ isTargetDeleted: true });
    const trigger = screen.getByTestId('draft-conversation-header-trigger');

    fireEvent.click(trigger);
    stop();

    expect(trigger).toBeDisabled();
    expect(identifiers).toEqual([]);
  });

  it('is enabled for a normal account', () => {
    renderHeader();

    expect(screen.getByTestId('draft-conversation-header-trigger')).toBeEnabled();
  });

  it('keeps the container the draft layout relies on', () => {
    renderHeader();

    expect(screen.getByTestId('draft-conversation-header')).toBeInTheDocument();
  });
});
