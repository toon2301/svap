import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ProfileOfferDetailSheetHeader } from '../ProfileOfferDetailSheetHeader';
import { shouldDismissBottomSheetDrag } from '../useBottomSheetDismiss';

describe('ProfileOfferDetailSheetHeader', () => {
  it('renders title, swipe hint and drag handle affordances', () => {
    const dragHandleProps = {
      onPointerDown: jest.fn(),
      onPointerMove: jest.fn(),
      onPointerUp: jest.fn(),
      onPointerCancel: jest.fn(),
      style: { touchAction: 'none' as const },
    };

    render(
      <ProfileOfferDetailSheetHeader
        title="Popis"
        swipeHint="Potiahni nadol pre zatvorenie"
        closeLabel="Zavrieť"
        onCloseClick={jest.fn()}
        dragHandleProps={dragHandleProps}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Popis' })).toBeInTheDocument();
    expect(screen.getByText('Potiahni nadol pre zatvorenie')).toBeInTheDocument();
    expect(screen.getByLabelText('Potiahni nadol pre zatvorenie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zavrieť' })).toBeInTheDocument();
  });

  it('calls onCloseClick when chevron button is clicked', () => {
    const onCloseClick = jest.fn();
    const dragHandleProps = {
      onPointerDown: jest.fn(),
      onPointerMove: jest.fn(),
      onPointerUp: jest.fn(),
      onPointerCancel: jest.fn(),
      style: { touchAction: 'none' as const },
    };

    render(
      <ProfileOfferDetailSheetHeader
        title="Popis"
        swipeHint="Potiahni nadol pre zatvorenie"
        closeLabel="Zavrieť"
        onCloseClick={onCloseClick}
        dragHandleProps={dragHandleProps}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zavrieť' }));
    expect(onCloseClick).toHaveBeenCalledTimes(1);
    expect(dragHandleProps.onPointerDown).not.toHaveBeenCalled();
  });
});

describe('shouldDismissBottomSheetDrag', () => {
  it('dismisses on distance threshold', () => {
    expect(shouldDismissBottomSheetDrag(80, 1000)).toBe(true);
  });

  it('dismisses on velocity threshold', () => {
    expect(shouldDismissBottomSheetDrag(40, 50)).toBe(true);
  });

  it('keeps the sheet open for small slow drags', () => {
    expect(shouldDismissBottomSheetDrag(20, 1000)).toBe(false);
  });
});
