/**
 * Jedno pole na komentár aj odpoveď na mobile (R75, kolo 3b redizajnu komentárov).
 *
 * V režime komentára je to kompaktné pole ako doteraz (jeden riadok, ikona odoslania v poli). V režime odpovede pribudne nad
 * pole riadok „Odpovedáš: Meno“, text poľa sa zmení na „Napíš odpoveď...“ a vpravo vedľa poľa je krížik. `textarea` sa pri
 * prepnutí režimu nesmie vymeniť, inak by iPhone zavrel klávesnicu.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy a poloha prvkov v strome; skutočný vzhľad sa meral v Chromiu.
 */

import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedCommentMobileComposer, {
  type FeedCommentMobileComposerProps,
} from '../FeedCommentMobileComposer';

const t = (_kluc: string, nahradny?: string) => nahradny ?? '';

function vlastnosti(
  navyse: Partial<FeedCommentMobileComposerProps> = {},
): FeedCommentMobileComposerProps {
  return {
    textareaRef: createRef<HTMLTextAreaElement>(),
    replying: false,
    value: '',
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    onCancelReply: jest.fn(),
    canSubmit: true,
    tooLong: false,
    readOnly: false,
    onFocusChange: jest.fn(),
    t,
    ...navyse,
  };
}

function vykresli(navyse: Partial<FeedCommentMobileComposerProps> = {}) {
  const props = vlastnosti(navyse);
  const view = render(<FeedCommentMobileComposer {...props} />);
  return { props, ...view };
}

describe('režim komentára', () => {
  it('je jednoriadkové pole „Napíš komentár...“ s ikonou odoslania „Pridať“, bez riadku s menom a krížika', () => {
    vykresli();

    const pole = screen.getByRole('textbox', { name: 'Napíš komentár...' });
    expect(pole).toHaveAttribute('rows', '1');
    expect(pole).toHaveAttribute('placeholder', 'Napíš komentár...');
    expect(screen.getByTestId('feed-comment-send')).toHaveAccessibleName('Pridať');
    expect(screen.queryByTestId('feed-reply-target')).toBeNull();
    expect(screen.queryByTestId('feed-reply-cancel')).toBeNull();
  });

  it('má rovnaké triedy ako dnešné kompaktné pole, takže sa vzhľad nemení', () => {
    vykresli();

    const pole = screen.getByRole('textbox');
    expect(pole).toHaveClass(
      'w-full',
      'rounded-xl',
      'border',
      'border-gray-300',
      'px-3',
      'py-2',
      'text-sm',
      'resize-none',
      'pr-12',
    );
    expect(screen.getByTestId('feed-comment-send')).toHaveClass(
      'absolute',
      'right-1.5',
      'top-1/2',
      'h-9',
      'w-9',
      'rounded-full',
    );
  });

  it('písanie volá `onChange` s novým textom', async () => {
    const { props } = vykresli();

    await userEvent.type(screen.getByRole('textbox'), 'a');

    expect(props.onChange).toHaveBeenCalledWith('a');
  });

  it('ikona odoslania volá odoslanie a bez `canSubmit` je zakázaná', async () => {
    const { props, rerender } = vykresli();

    await userEvent.click(screen.getByTestId('feed-comment-send'));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);

    rerender(<FeedCommentMobileComposer {...props} canSubmit={false} />);
    expect(screen.getByTestId('feed-comment-send')).toBeDisabled();
  });

  it('počítadlo znakov ukáže len pri prekročenej dĺžke', () => {
    const { props, rerender } = vykresli({ value: 'a'.repeat(501) });
    expect(screen.queryByTestId('feed-comment-counter')).toBeNull();

    rerender(
      <FeedCommentMobileComposer {...props} value={'a'.repeat(501)} tooLong />,
    );
    expect(screen.getByTestId('feed-comment-counter')).toHaveTextContent('501/500');
  });
});

describe('režim odpovede', () => {
  it('ukáže riadok „Odpovedáš: Meno“ s tučným menom a zmení pole aj ikonu na odpoveď', () => {
    vykresli({ replying: true, replyTargetName: 'Peter' });

    const riadok = screen.getByTestId('feed-reply-target');
    expect(riadok).toHaveTextContent('Odpovedáš: Peter');
    expect(riadok.querySelector('span')).toHaveTextContent('Peter');
    expect(riadok.querySelector('span')).toHaveClass('font-semibold');
    expect(
      screen.getByRole('textbox', { name: 'Napíš odpoveď...' }),
    ).toHaveAttribute('placeholder', 'Napíš odpoveď...');
    expect(screen.getByTestId('feed-comment-send')).toHaveAccessibleName('Odpovedať');
  });

  it('bez mena ukáže len „Odpovedáš:“', () => {
    vykresli({ replying: true });

    const riadok = screen.getByTestId('feed-reply-target');
    expect(riadok).toHaveTextContent('Odpovedáš:');
    expect(riadok.querySelector('span')).toBeNull();
  });

  it('dlhé meno sa skracuje, aby riadok nepretiekol', () => {
    vykresli({ replying: true, replyTargetName: 'Meno '.repeat(40) });

    expect(screen.getByTestId('feed-reply-target')).toHaveClass('truncate');
  });

  it('krížik je vpravo vedľa poľa (po poli, v tom istom riadku) a ukončí odpovedanie', async () => {
    const { props } = vykresli({ replying: true, replyTargetName: 'Peter' });

    const krizik = screen.getByTestId('feed-reply-cancel');
    const pole = screen.getByRole('textbox');
    expect(krizik).toHaveAccessibleName('Zrušiť odpoveď');
    expect(krizik.parentElement).toBe(pole.closest('.flex'));
    const obalPola = pole.parentElement as HTMLElement;
    expect(
      obalPola.compareDocumentPosition(krizik) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(krizik).toHaveClass('h-10', 'w-10', 'rounded-full');

    await userEvent.click(krizik);
    expect(props.onCancelReply).toHaveBeenCalledTimes(1);
  });

  it('krížik je vystredený na samotné pole (`items-start` a `-mt-px`), nie na vyšší obal poľa', () => {
    vykresli({ replying: true });

    const krizik = screen.getByTestId('feed-reply-cancel');
    expect(krizik.parentElement).toHaveClass('items-start');
    expect(krizik).toHaveClass('-mt-px');
  });

  it('ťuk na krížik nezoberie poľu fokus: stlačenie sa zruší už pri `pointerdown` aj `mousedown`', () => {
    vykresli({ replying: true });

    const krizik = screen.getByTestId('feed-reply-cancel');
    // `fireEvent` vráti false, keď obsluha zavolala `preventDefault`.
    expect(fireEvent.pointerDown(krizik)).toBe(false);
    expect(fireEvent.mouseDown(krizik)).toBe(false);
  });

  it('ikona odoslania volá odoslanie aj v režime odpovede', async () => {
    const { props } = vykresli({ replying: true, value: 'Odpoveď' });

    await userEvent.click(screen.getByTestId('feed-comment-send'));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('počas odosielania je pole len na čítanie, no ostáva v strome (klávesnica sa nezatvorí)', () => {
    vykresli({ replying: true, readOnly: true, value: 'Odpoveď' });

    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });
});

describe('prepínanie režimov a fokus', () => {
  it('pri prepnutí režimu je pole ten istý prvok a ostáva zaostrené', () => {
    const { props, rerender } = vykresli({ value: 'Skvelý príspevok' });
    const pole = screen.getByRole('textbox');
    pole.focus();
    expect(pole).toHaveFocus();

    rerender(
      <FeedCommentMobileComposer
        {...props}
        replying
        replyTargetName="Peter"
        value=""
      />,
    );

    expect(screen.getByRole('textbox')).toBe(pole);
    expect(pole).toHaveFocus();
    expect(pole).toHaveValue('');

    rerender(
      <FeedCommentMobileComposer {...props} replying={false} value="Skvelý príspevok" />,
    );
    expect(screen.getByRole('textbox')).toBe(pole);
    expect(pole).toHaveFocus();
    expect(pole).toHaveValue('Skvelý príspevok');
  });

  it('hlási získanie aj stratu fokusu', () => {
    const { props } = vykresli();
    const pole = screen.getByRole('textbox');

    fireEvent.focus(pole);
    expect(props.onFocusChange).toHaveBeenLastCalledWith(true);

    fireEvent.blur(pole);
    expect(props.onFocusChange).toHaveBeenLastCalledWith(false);
  });

  it('zapíše text poľa do odovzdaného refu, aby ho vedela obrazovka zaostriť', () => {
    const { props } = vykresli();

    expect(props.textareaRef.current).toBe(screen.getByRole('textbox'));
  });
});
