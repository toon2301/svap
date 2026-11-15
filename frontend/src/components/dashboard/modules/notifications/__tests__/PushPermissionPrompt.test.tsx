import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import sk from '../../../../../../messages/sk.json';
import PushPermissionPrompt from '../PushPermissionPrompt';
import type { PushPromptLabels, PushPromptProps } from '../settingsTypes';

/**
 * Výzva na povolenie push pre Správy (nález 321, etapa 3b, R36 a): pomenovaná oblasť s nadpisom, textom a tlačidlami.
 * Tlačidlo na povolenie (len pri `enable`) volá `enable` priamo v obsluhe kliknutia a je zakázané, kým beží ukladanie
 * alebo iná akcia; „Nie teraz“ výzvu odmietne. Pri `ios-install` je namiesto bežného textu návod a tlačidlo na
 * povolenie chýba, pri `null` sa nevykreslí nič.
 */
const LABELS: PushPromptLabels = {
  title: sk.notifications.pushPromptTitle,
  body: sk.notifications.pushPromptBody,
  enable: sk.notifications.pushPromptEnable,
  dismiss: sk.notifications.pushPromptDismiss,
  iosGuide: sk.notifications.pushPromptIosGuide,
};

const promptProps = (overrides: Partial<PushPromptProps> = {}): PushPromptProps => ({
  variant: 'enable',
  disabled: false,
  enable: jest.fn(),
  dismiss: jest.fn(),
  ...overrides,
});

const renderPrompt = (overrides: Partial<PushPromptProps> = {}, testId = 'push-prompt') => {
  const prompt = promptProps(overrides);
  const view = render(<PushPermissionPrompt prompt={prompt} labels={LABELS} testId={testId} />);
  return { prompt, ...view };
};

describe('PushPermissionPrompt: výzva s tlačidlom (enable)', () => {
  it('je pomenovaná oblasť s nadpisom, textom a tlačidlami „Zapnúť“ a „Nie teraz“', () => {
    renderPrompt();

    const region = screen.getByRole('region', { name: LABELS.title });
    expect(screen.getByRole('heading', { level: 4, name: LABELS.title })).toBeInTheDocument();
    expect(region).toHaveTextContent(LABELS.body);
    expect(screen.getByRole('button', { name: LABELS.enable })).toBeEnabled();
    expect(screen.getByRole('button', { name: LABELS.dismiss })).toBeEnabled();
    expect(screen.queryByText(LABELS.iosGuide)).not.toBeInTheDocument();
  });

  it('obe tlačidlá sú `type="button"` (nič neodošlú) a `data-testid` je na oblasti', () => {
    renderPrompt({}, 'notifications-push-prompt-desktop');

    expect(screen.getByRole('button', { name: LABELS.enable })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: LABELS.dismiss })).toHaveAttribute('type', 'button');
    expect(screen.getByTestId('notifications-push-prompt-desktop')).toBe(screen.getByRole('region', { name: LABELS.title }));
  });

  it('tlačidlo „Zapnúť“ zavolá `enable` práve raz a hneď v obsluhe kliknutia, bez čakania', () => {
    const { prompt } = renderPrompt();

    fireEvent.click(screen.getByRole('button', { name: LABELS.enable }));

    expect(prompt.enable).toHaveBeenCalledTimes(1);
    expect(prompt.dismiss).not.toHaveBeenCalled();
  });

  it('tlačidlo „Nie teraz“ zavolá `dismiss` práve raz a nič nevyžiada', () => {
    const { prompt } = renderPrompt();

    fireEvent.click(screen.getByRole('button', { name: LABELS.dismiss }));

    expect(prompt.dismiss).toHaveBeenCalledTimes(1);
    expect(prompt.enable).not.toHaveBeenCalled();
  });

  it('kým beží ukladanie alebo iná akcia, je „Zapnúť“ zakázané a nič nevyžiada; „Nie teraz“ ostáva dostupné', () => {
    const { prompt } = renderPrompt({ disabled: true });

    const enable = screen.getByRole('button', { name: LABELS.enable });
    expect(enable).toBeDisabled();
    fireEvent.click(enable);

    expect(prompt.enable).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: LABELS.dismiss })).toBeEnabled();
  });
});

describe('PushPermissionPrompt: návod pre iPhone (ios-install)', () => {
  it('namiesto bežného textu ukáže návod a tlačidlo „Zapnúť“ chýba', () => {
    renderPrompt({ variant: 'ios-install' });

    const region = screen.getByRole('region', { name: LABELS.title });
    expect(region).toHaveTextContent(LABELS.iosGuide);
    expect(screen.queryByText(LABELS.body)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: LABELS.enable })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: LABELS.dismiss })).toBeEnabled();
  });

  it('„Nie teraz“ zavolá `dismiss`', () => {
    const { prompt } = renderPrompt({ variant: 'ios-install' });

    fireEvent.click(screen.getByRole('button', { name: LABELS.dismiss }));

    expect(prompt.dismiss).toHaveBeenCalledTimes(1);
    expect(prompt.enable).not.toHaveBeenCalled();
  });
});

describe('PushPermissionPrompt: bez výzvy a dve výzvy v jednom dokumente', () => {
  it('pri `null` sa nevykreslí nič', () => {
    const { container } = renderPrompt({ variant: null });

    expect(container).toBeEmptyDOMElement();
  });

  it('dve výzvy naraz (počítač a mobil) majú každá vlastný nadpis a vlastný identifikátor', () => {
    render(
      <>
        <PushPermissionPrompt prompt={promptProps()} labels={LABELS} testId="notifications-push-prompt-desktop" />
        <PushPermissionPrompt prompt={promptProps()} labels={LABELS} testId="notifications-push-prompt-mobile" />
      </>,
    );

    const regions = screen.getAllByRole('region', { name: LABELS.title });
    expect(regions).toHaveLength(2);
    const [first, second] = regions;
    expect(first.getAttribute('aria-labelledby')).toBeTruthy();
    expect(second.getAttribute('aria-labelledby')).toBeTruthy();
    expect(first.getAttribute('aria-labelledby')).not.toBe(second.getAttribute('aria-labelledby'));
    expect(screen.getByTestId('notifications-push-prompt-desktop')).toBe(first);
    expect(screen.getByTestId('notifications-push-prompt-mobile')).toBe(second);
  });
});
