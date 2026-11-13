import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { AddReviewModalDesktop } from '../AddReviewModalDesktop';
import { AddReviewModalMobile } from '../AddReviewModalMobile';
import type { AddReviewModalProps } from '../addReviewModalShared';

/**
 * Okno „Pridať recenziu“ po úspešnom pridaní (nález 331). Stránka s recenziami okno po pridaní len zatvorí (`open` prejde
 * na `false`, kľúč okna je pri pridaní stály), takže jeho stav ostáva. `isSubmitting` sa vracal na `false` len pri chybe,
 * a pri ďalšom otvorení v tej istej návšteve stránky bolo tlačidlo hneď zakázané s textom „Načítavam...“ (pomohlo až
 * obnovenie stránky). Obal v teste napodobňuje stránku (`OfferReviewsView.tsx`): po úspešnom `onSubmit` okno zatvorí a
 * tlačidlo ho otvorí znova.
 */
type Review = NonNullable<AddReviewModalProps['reviewToEdit']>;
type SubmitHandler = NonNullable<AddReviewModalProps['onSubmit']>;

interface PageHarnessProps {
  Modal: React.ComponentType<AddReviewModalProps>;
  onSubmit: SubmitHandler;
  reviewToEdit?: Review | null;
}

/**
 * Napodobňuje stránku recenzií: kľúč okna je stály (pri pridaní `'new-review'`, pri úprave ID recenzie), okno sa po
 * úspešnom odoslaní zatvorí a pri zlyhaní ostane otvorené (chyba sa vyhodí späť do okna).
 */
function PageHarness({ Modal, onSubmit, reviewToEdit = null }: PageHarnessProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Otvoriť okno
      </button>
      <Modal
        key={reviewToEdit?.id || 'new-review'}
        open={open}
        onClose={() => setOpen(false)}
        reviewerName="Peter Novák"
        reviewToEdit={reviewToEdit}
        onSubmit={async (rating, text, pros, cons) => {
          await onSubmit(rating, text, pros, cons);
          setOpen(false);
        }}
      />
    </>
  );
}

const WINDOWS: ReadonlyArray<[string, React.ComponentType<AddReviewModalProps>]> = [
  ['mobilné okno', AddReviewModalMobile],
  ['desktopové okno', AddReviewModalDesktop],
];

const LOADING_LABEL = 'Načítavam...';

const openModal = () => fireEvent.click(screen.getByRole('button', { name: 'Otvoriť okno' }));

/** Hodnotenie hviezdičkami (v jsdom je šírka prvku 0, takže klepnutie dá celú hviezdičku). */
const rate = (stars: number) => {
  fireEvent.click(screen.getByRole('button', { name: `${stars} ${stars === 1 ? 'hviezdička' : 'hviezdičky'}` }));
};

/** Klepne na tlačidlo uloženia a počká, kým sa dokončí asynchrónne odoslanie. */
const submit = async (label: 'Pridať' | 'Uložiť' = 'Pridať') => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
};

/** Sľub, ktorý sa dokončí až na požiadanie: drží odosielanie „v lete“. */
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const reviewToEdit = (): Review => ({
  id: 7,
  rating: 4,
  text: 'Pôvodná recenzia',
  pros: ['Pôvodný plus'],
  cons: ['Pôvodný mínus'],
});

describe.each(WINDOWS)('%s „Pridať recenziu“: opätovné otvorenie (nález 331)', (_name, Modal) => {
  it('po úspešnom pridaní a opätovnom otvorení je tlačidlo „Pridať“ použiteľné a druhé odoslanie zavolá onSubmit znova', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<PageHarness Modal={Modal} onSubmit={onSubmit} />);

    openModal();
    rate(4);
    await submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    openModal();
    rate(5);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: LOADING_LABEL })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pridať' })).toBeEnabled();

    await submit();

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenLastCalledWith(5, '', [], []);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opakovane (pridať, zavrieť, pridať…): tlačidlo je použiteľné aj tretí a štvrtý raz', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<PageHarness Modal={Modal} onSubmit={onSubmit} />);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      openModal();
      rate(3);

      expect(screen.queryByRole('button', { name: LOADING_LABEL })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pridať' })).toBeEnabled();

      await submit();

      expect(onSubmit).toHaveBeenCalledTimes(attempt);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  });

  it('počas odosielania je tlačidlo zakázané s textom „Načítavam...“ a opakované klepnutie nepošle recenziu dvakrát', async () => {
    const pending = deferred();
    const onSubmit = jest.fn().mockReturnValue(pending.promise);
    render(<PageHarness Modal={Modal} onSubmit={onSubmit} />);

    openModal();
    rate(4);
    fireEvent.click(screen.getByRole('button', { name: 'Pridať' }));

    const sending = await screen.findByRole('button', { name: LOADING_LABEL });
    expect(sending).toBeDisabled();
    fireEvent.click(sending);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pri zlyhaní odoslania ostane okno otvorené, ukáže sa chyba a tlačidlo sa odomkne (ako doteraz)', async () => {
    const onSubmit = jest
      .fn()
      .mockRejectedValueOnce(new Error('Server je nedostupný.'))
      .mockResolvedValue(undefined);
    render(<PageHarness Modal={Modal} onSubmit={onSubmit} />);

    openModal();
    rate(4);
    await submit();

    expect(await screen.findByText('Server je nedostupný.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: LOADING_LABEL })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pridať' })).toBeEnabled();

    await submit();

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('úprava recenzie: po uložení a opätovnom otvorení je tlačidlo „Uložiť“ použiteľné a okno ukáže pôvodné hodnoty', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<PageHarness Modal={Modal} onSubmit={onSubmit} reviewToEdit={reviewToEdit()} />);

    openModal();
    await submit('Uložiť');

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenLastCalledWith(4, 'Pôvodná recenzia', ['Pôvodný plus'], ['Pôvodný mínus']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    openModal();

    expect(screen.getByRole('button', { name: 'Uložiť' })).toBeEnabled();
    expect(screen.getByDisplayValue('Pôvodná recenzia')).toBeInTheDocument();

    await submit('Uložiť');

    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
