import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import cs from '../../../../../../messages/cs.json';
import de from '../../../../../../messages/de.json';
import en from '../../../../../../messages/en.json';
import hu from '../../../../../../messages/hu.json';
import pl from '../../../../../../messages/pl.json';
import sk from '../../../../../../messages/sk.json';
import { AddReviewModalDesktop } from '../AddReviewModalDesktop';
import { AddReviewModalMobile } from '../AddReviewModalMobile';
import { MAX_ITEM_CHARS, MAX_PRO_CON_ITEMS, type AddReviewModalProps } from '../addReviewModalShared';

/**
 * Plusy a mínusy vo formulári recenzie (nález 327). Pri písaní sa položka pridala do zoznamu len klávesom Enter, na
 * mobile bez tlačidla, a text, ktorý používateľ napísal a nepotvrdil, sa pri uložení potichu zahodil. Mobilný formulár
 * má mať tlačidlo plus pri oboch vstupoch a oba formuláre majú pri uložení pridať aj nepotvrdený text.
 */
const PROS_PLACEHOLDER = 'Napíšte plus a stlačte Enter';
const CONS_PLACEHOLDER = 'Napíšte mínus a stlačte Enter';

type Review = NonNullable<AddReviewModalProps['reviewToEdit']>;

const baseProps = (overrides: Partial<AddReviewModalProps> = {}): AddReviewModalProps => ({
  open: true,
  onClose: jest.fn(),
  reviewerName: 'Peter Novák',
  onSubmit: jest.fn(),
  ...overrides,
});

/** Hodnotenie štyrmi hviezdičkami (v jsdom je šírka prvku 0, takže klepnutie dá celú hviezdičku). */
const rate = (stars: number) => {
  fireEvent.click(screen.getByRole('button', { name: `${stars} ${stars === 1 ? 'hviezdička' : 'hviezdičky'}` }));
};

const prosInput = () => screen.getByPlaceholderText(PROS_PLACEHOLDER);
const consInput = () => screen.getByPlaceholderText(CONS_PLACEHOLDER);
const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });
const pressEnter = (input: HTMLElement) => fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

/** Klepne na tlačidlo uloženia a počká, kým sa dokončí asynchrónne odoslanie. */
const submit = async (label: 'Pridať' | 'Uložiť' = 'Pridať') => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
};

const reviewToEdit = (overrides: Partial<Review> = {}): Review => ({
  id: 7,
  rating: 4,
  text: 'Pôvodná recenzia',
  pros: ['Pôvodný plus'],
  cons: ['Pôvodný mínus'],
  ...overrides,
});

describe('AddReviewModalMobile: plusy a mínusy (nález 327)', () => {
  describe('tlačidlo na pridanie', () => {
    it('plus: tlačidlo pridá napísaný text do zoznamu plusov a vyčistí vstup', () => {
      render(<AddReviewModalMobile {...baseProps()} />);

      type(prosInput(), 'Rýchla komunikácia');
      fireEvent.click(screen.getByRole('button', { name: 'Pridať plus' }));

      expect(screen.getByText('Rýchla komunikácia')).toBeInTheDocument();
      expect(prosInput()).toHaveValue('');
    });

    it('mínus: tlačidlo pridá napísaný text do zoznamu mínusov a vyčistí vstup', () => {
      render(<AddReviewModalMobile {...baseProps()} />);

      type(consInput(), 'Neskorý príchod');
      fireEvent.click(screen.getByRole('button', { name: 'Pridať mínus' }));

      expect(screen.getByText('Neskorý príchod')).toBeInTheDocument();
      expect(consInput()).toHaveValue('');
    });

    it('tlačidlá sú dve a každé patrí k svojmu vstupu: plus nepridá do mínusov a naopak', () => {
      render(<AddReviewModalMobile {...baseProps()} />);

      type(prosInput(), 'Len plus');
      type(consInput(), 'Len mínus');
      fireEvent.click(screen.getByRole('button', { name: 'Pridať plus' }));

      expect(screen.getByText('Len plus')).toBeInTheDocument();
      expect(prosInput()).toHaveValue('');
      expect(consInput()).toHaveValue('Len mínus');
      expect(screen.queryByText('Len mínus')).not.toBeInTheDocument();
    });

    it('tlačidlo je zakázané, kým je vstup prázdny alebo len z medzier', () => {
      render(<AddReviewModalMobile {...baseProps()} />);
      const addPro = screen.getByRole('button', { name: 'Pridať plus' });

      expect(addPro).toBeDisabled();
      type(prosInput(), '   ');
      expect(addPro).toBeDisabled();
      type(prosInput(), 'Text');
      expect(addPro).toBeEnabled();
    });

    it('Enter funguje ako predtým a tlačidlo ho nenahrádza', () => {
      render(<AddReviewModalMobile {...baseProps()} />);

      type(prosInput(), 'Cez Enter');
      pressEnter(prosInput());

      expect(screen.getByText('Cez Enter')).toBeInTheDocument();
      expect(prosInput()).toHaveValue('');
    });

    it('pri desiatich plusoch je tlačidlo zakázané a ďalší plus sa nepridá', () => {
      const pros = Array.from({ length: MAX_PRO_CON_ITEMS }, (_, i) => `Plus ${i + 1}`);
      render(<AddReviewModalMobile {...baseProps({ reviewToEdit: reviewToEdit({ pros }) })} />);

      type(prosInput(), 'Jedenásty');

      expect(screen.getByRole('button', { name: 'Pridať plus' })).toBeDisabled();
      pressEnter(prosInput());
      expect(screen.queryByText('Jedenásty')).not.toBeInTheDocument();
      expect(screen.getByText('Maximálny počet položiek')).toBeInTheDocument();
    });
  });

  describe('uloženie s nepotvrdeným textom', () => {
    it('nepotvrdený plus sa pri uložení pridá: onSubmit ho dostane v `pros`', async () => {
      const onSubmit = jest.fn();
      render(<AddReviewModalMobile {...baseProps({ onSubmit })} />);

      rate(4);
      type(prosInput(), 'Nepotvrdený plus');
      await submit();

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(4, '', ['Nepotvrdený plus'], []);
    });

    it('nepotvrdený mínus sa pri uložení pridá: onSubmit ho dostane v `cons`', async () => {
      const onSubmit = jest.fn();
      render(<AddReviewModalMobile {...baseProps({ onSubmit })} />);

      rate(2);
      type(consInput(), 'Nepotvrdený mínus');
      await submit();

      expect(onSubmit).toHaveBeenCalledWith(2, '', [], ['Nepotvrdený mínus']);
    });

    it('potvrdené (Enter) aj nepotvrdené položky sa odošlú v poradí, v akom boli zadané', async () => {
      const onSubmit = jest.fn();
      render(<AddReviewModalMobile {...baseProps({ onSubmit })} />);

      rate(5);
      type(prosInput(), 'Prvý plus');
      pressEnter(prosInput());
      type(prosInput(), 'Druhý plus');
      type(consInput(), 'Jediný mínus');
      await submit();

      expect(onSubmit).toHaveBeenCalledWith(5, '', ['Prvý plus', 'Druhý plus'], ['Jediný mínus']);
    });

    it('úprava recenzie: nový plus sa pridá a pôvodné plusy aj mínusy ostanú', async () => {
      const onSubmit = jest.fn();
      render(<AddReviewModalMobile {...baseProps({ onSubmit, reviewToEdit: reviewToEdit() })} />);

      type(prosInput(), 'Nový plus');
      await submit('Uložiť');

      expect(onSubmit).toHaveBeenCalledWith(4, 'Pôvodná recenzia', ['Pôvodný plus', 'Nový plus'], ['Pôvodný mínus']);
    });

    it('pri desiatich položkách sa nepotvrdený text pri uložení nepridá (plusy aj mínusy)', async () => {
      const pros = Array.from({ length: MAX_PRO_CON_ITEMS }, (_, i) => `Plus ${i + 1}`);
      const cons = Array.from({ length: MAX_PRO_CON_ITEMS }, (_, i) => `Mínus ${i + 1}`);
      const onSubmit = jest.fn();
      render(<AddReviewModalMobile {...baseProps({ onSubmit, reviewToEdit: reviewToEdit({ pros, cons }) })} />);

      type(prosInput(), 'Nadbytočný plus');
      type(consInput(), 'Nadbytočný mínus');
      await submit('Uložiť');

      expect(onSubmit).toHaveBeenCalledWith(4, 'Pôvodná recenzia', pros, cons);
    });

    it('prázdny text a text len z medzier sa pri uložení nepridá', async () => {
      const onSubmit = jest.fn();
      render(<AddReviewModalMobile {...baseProps({ onSubmit })} />);

      rate(3);
      type(prosInput(), '   ');
      type(consInput(), '');
      await submit();

      expect(onSubmit).toHaveBeenCalledWith(3, '', [], []);
    });

    it('text sa pri uložení oreže o medzery na začiatku aj na konci', async () => {
      const onSubmit = jest.fn();
      render(<AddReviewModalMobile {...baseProps({ onSubmit })} />);

      rate(4);
      type(prosInput(), '  Medzery okolo  ');
      await submit();

      expect(onSubmit).toHaveBeenCalledWith(4, '', ['Medzery okolo'], []);
    });

    it('text dlhší ako 120 znakov sa pri uložení pridá skrátený na 120', async () => {
      const onSubmit = jest.fn();
      render(<AddReviewModalMobile {...baseProps({ onSubmit })} />);

      rate(4);
      type(consInput(), 'x'.repeat(MAX_ITEM_CHARS + 50));
      await submit();

      expect(onSubmit).toHaveBeenCalledWith(4, '', [], ['x'.repeat(MAX_ITEM_CHARS)]);
    });

    it('neúspešné uloženie: nepotvrdený plus ostane v zozname, vstup je prázdny a ďalšie uloženie ho pošle práve raz', async () => {
      const onSubmit = jest
        .fn()
        .mockRejectedValueOnce(new Error('Server je nedostupný.'))
        .mockResolvedValue(undefined);
      render(<AddReviewModalMobile {...baseProps({ onSubmit })} />);

      rate(4);
      type(prosInput(), 'Pošli ma dvakrát');
      await submit();

      expect(await screen.findByText('Server je nedostupný.')).toBeInTheDocument();
      expect(screen.getByText('Pošli ma dvakrát')).toBeInTheDocument();
      expect(prosInput()).toHaveValue('');

      await submit();

      expect(onSubmit).toHaveBeenCalledTimes(2);
      expect(onSubmit).toHaveBeenLastCalledWith(4, '', ['Pošli ma dvakrát'], []);
    });
  });
});

describe('AddReviewModalDesktop: nepotvrdený text pri uložení (nález 327)', () => {
  it('nepotvrdený plus aj mínus sa pri uložení pridajú: onSubmit ich dostane', async () => {
    const onSubmit = jest.fn();
    render(<AddReviewModalDesktop {...baseProps({ onSubmit })} />);

    rate(4);
    type(prosInput(), 'Desktop plus');
    type(consInput(), 'Desktop mínus');
    await submit();

    expect(onSubmit).toHaveBeenCalledWith(4, '', ['Desktop plus'], ['Desktop mínus']);
  });

  it('úprava recenzie: nový mínus sa pridá a pôvodné ostanú', async () => {
    const onSubmit = jest.fn();
    render(<AddReviewModalDesktop {...baseProps({ onSubmit, reviewToEdit: reviewToEdit() })} />);

    type(consInput(), 'Nový mínus');
    await submit('Uložiť');

    expect(onSubmit).toHaveBeenCalledWith(4, 'Pôvodná recenzia', ['Pôvodný plus'], ['Pôvodný mínus', 'Nový mínus']);
  });

  it('pri desiatich plusoch sa nepotvrdený plus pri uložení nepridá', async () => {
    const pros = Array.from({ length: MAX_PRO_CON_ITEMS }, (_, i) => `Plus ${i + 1}`);
    const onSubmit = jest.fn();
    render(<AddReviewModalDesktop {...baseProps({ onSubmit, reviewToEdit: reviewToEdit({ pros }) })} />);

    type(prosInput(), 'Nadbytočný');
    await submit('Uložiť');

    expect(onSubmit).toHaveBeenCalledWith(4, 'Pôvodná recenzia', pros, ['Pôvodný mínus']);
  });

  it('rozloženie sa nemení: desktopový formulár nemá tlačidlo na pridanie plusu ani mínusu', () => {
    render(<AddReviewModalDesktop {...baseProps()} />);

    expect(screen.queryByRole('button', { name: 'Pridať plus' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pridať mínus' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getAllByRole('textbox').length).toBeGreaterThanOrEqual(3);
  });
});

describe('preklady tlačidiel na pridanie plusu a mínusu (nález 327)', () => {
  it('kľúče `reviews.addPro` a `reviews.addCon` sú vo všetkých šiestich jazykoch a slovenský text zodpovedá záložnému', () => {
    [sk, cs, en, pl, de, hu].forEach((messages) => {
      expect(typeof messages.reviews.addPro).toBe('string');
      expect(messages.reviews.addPro.trim()).not.toBe('');
      expect(typeof messages.reviews.addCon).toBe('string');
      expect(messages.reviews.addCon.trim()).not.toBe('');
    });
    expect(sk.reviews.addPro).toBe('Pridať plus');
    expect(sk.reviews.addCon).toBe('Pridať mínus');
  });
});
