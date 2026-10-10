import { startBoundedImageRefresh } from '../offerImageRefresh';
import type { DashboardSkill } from '../useSkillsModals';

const DELAY_MS = 1500;
const MAX_ATTEMPTS = 5;

const skillWith = (...statuses: string[]): DashboardSkill => ({
  id: 7,
  category: 'Remeslá',
  subcategory: 'Maľovanie',
  images: statuses.map((status, index) => ({ id: index + 1, image_url: null, status })),
});

describe('startBoundedImageRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('prvé načítanie spustí až po oneskorení', async () => {
    const fetchSkillDetail = jest.fn().mockResolvedValue(skillWith('approved'));

    startBoundedImageRefresh(7, fetchSkillDetail, jest.fn());
    expect(fetchSkillDetail).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(DELAY_MS);

    expect(fetchSkillDetail).toHaveBeenCalledWith(7);
  });

  it('aktuálny stav karty odovzdá cez applySkillUpdate pri každom načítaní', async () => {
    const latest = skillWith('pending');
    const fetchSkillDetail = jest.fn().mockResolvedValue(latest);
    const applySkillUpdate = jest.fn();

    startBoundedImageRefresh(7, fetchSkillDetail, applySkillUpdate);
    await jest.advanceTimersByTimeAsync(DELAY_MS);

    expect(applySkillUpdate).toHaveBeenCalledWith(latest);
  });

  it('po prvom načítaní bez čakajúcich fotiek skončí a ohlási to raz', async () => {
    const fetchSkillDetail = jest.fn().mockResolvedValue(skillWith('approved', 'approved'));
    const onSettled = jest.fn();

    startBoundedImageRefresh(7, fetchSkillDetail, jest.fn(), onSettled);
    await jest.advanceTimersByTimeAsync(DELAY_MS);

    expect(onSettled).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(DELAY_MS * (MAX_ATTEMPTS + 2));
    expect(fetchSkillDetail).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('kým je niektorá fotka čakajúca, načíta znova a neohlási nič', async () => {
    const fetchSkillDetail = jest
      .fn()
      .mockResolvedValueOnce(skillWith('approved', 'pending'))
      .mockResolvedValueOnce(skillWith('approved', 'pending'))
      .mockResolvedValue(skillWith('approved', 'approved'));
    const onSettled = jest.fn();

    startBoundedImageRefresh(7, fetchSkillDetail, jest.fn(), onSettled);

    await jest.advanceTimersByTimeAsync(DELAY_MS);
    expect(fetchSkillDetail).toHaveBeenCalledTimes(1);
    expect(onSettled).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(DELAY_MS);
    expect(fetchSkillDetail).toHaveBeenCalledTimes(2);
    expect(onSettled).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(DELAY_MS);
    expect(fetchSkillDetail).toHaveBeenCalledTimes(3);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('po vyčerpaní pokusov skončí bez ďalšieho načítania a ohlási to raz', async () => {
    const fetchSkillDetail = jest.fn().mockResolvedValue(skillWith('pending'));
    const onSettled = jest.fn();

    startBoundedImageRefresh(7, fetchSkillDetail, jest.fn(), onSettled);
    await jest.advanceTimersByTimeAsync(DELAY_MS * MAX_ATTEMPTS);

    expect(fetchSkillDetail).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(onSettled).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(DELAY_MS);
    expect(fetchSkillDetail).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(onSettled).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(DELAY_MS * 3);
    expect(fetchSkillDetail).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('dočasná chyba siete načítanie zopakuje a po úspechu to ohlási', async () => {
    const fetchSkillDetail = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(skillWith('approved'));
    const applySkillUpdate = jest.fn();
    const onSettled = jest.fn();

    startBoundedImageRefresh(7, fetchSkillDetail, applySkillUpdate, onSettled);

    await jest.advanceTimersByTimeAsync(DELAY_MS);
    expect(applySkillUpdate).not.toHaveBeenCalled();
    expect(onSettled).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(DELAY_MS);
    expect(applySkillUpdate).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('bez funkcie na ohlásenie funguje ako doteraz', async () => {
    const fetchSkillDetail = jest.fn().mockResolvedValue(skillWith('approved'));
    const applySkillUpdate = jest.fn();

    startBoundedImageRefresh(7, fetchSkillDetail, applySkillUpdate);
    await jest.advanceTimersByTimeAsync(DELAY_MS * 2);

    expect(applySkillUpdate).toHaveBeenCalledTimes(1);
  });
});
