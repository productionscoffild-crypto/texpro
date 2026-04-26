import { useCallback, useEffect, useState } from 'react';

const T_BANK_RATES_URL = 'https://www.tinkoff.ru/api/v1/currency_rates/';
const CACHE_KEY = 'textile-commercial-usd-rate';
let rateLoadedThisSession = false;

interface RateState {
  value: number | null;
  buy: number | null;
  updatedAt: string | null;
  loading: boolean;
  error: string | null;
  source?: 'tbank' | 'cache';
}

type TBankRate = {
  category: string;
  fromCurrency?: { code?: number };
  toCurrency?: { code?: number };
  buy?: number;
  sell?: number;
};

const COMMERCIAL_CATEGORIES = [
  'DebitCardsTransfers',
  'C2CTransfers',
  'DebitCardsOperations',
  'SavingAccountTransfers',
];

const loadCommercialUsd = async () => {
  const response = await fetch(`${T_BANK_RATES_URL}?_=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`T-Bank request failed: ${response.status}`);
  const data = await response.json();
  const rates: TBankRate[] = data?.payload?.rates || [];

  const usdRubRates = rates.filter(rate =>
    rate.fromCurrency?.code === 840 &&
    rate.toCurrency?.code === 643 &&
    typeof rate.sell === 'number'
  );

  const selected =
    COMMERCIAL_CATEGORIES.map(category => usdRubRates.find(rate => rate.category === category)).find(Boolean) ||
    usdRubRates[0];

  if (!selected?.sell) throw new Error('Commercial USD sell rate not found');

  const updatedAtMs = Number(data?.payload?.lastUpdate?.milliseconds);
  return {
    value: selected.sell,
    buy: selected.buy ?? null,
    updatedAt: Number.isFinite(updatedAtMs) ? new Date(updatedAtMs).toISOString() : new Date().toISOString(),
  };
};

export default function ExchangeRate() {
  const [state, setState] = useState<RateState>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return { ...JSON.parse(cached), loading: false, error: null, source: 'cache' };
    } catch {
      // Ignore broken cache.
    }
    return { value: null, buy: null, updatedAt: null, loading: true, error: null };
  });

  const loadRate = useCallback(async () => {
    setState(prev => ({ ...prev, loading: !prev.value, error: null }));
    try {
      const parsed = await loadCommercialUsd();
      const nextState: RateState = {
        value: parsed.value,
        buy: parsed.buy,
        updatedAt: parsed.updatedAt,
        loading: false,
        error: null,
        source: 'tbank',
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(nextState));
      setState(nextState);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        source: prev.value ? 'cache' : prev.source,
        error: error instanceof Error ? error.message : 'Не удалось загрузить коммерческий курс',
      }));
    }
  }, []);

  useEffect(() => {
    if (rateLoadedThisSession) return;
    rateLoadedThisSession = true;
    void loadRate();
  }, [loadRate]);

  const updatedText = state.updatedAt
    ? new Date(state.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className="mb-3 w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-left transition-colors hover:bg-emerald-100"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-emerald-600">Купить USD</span>
        <span className={`h-2 w-2 rounded-full ${state.loading ? 'bg-amber-400' : state.error ? 'bg-red-400' : 'bg-emerald-500'}`} />
      </div>
      <div className="mt-1 text-[18px] font-bold text-emerald-700">
        {state.value ? `${state.value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₽` : '—'}
      </div>
      <div className="mt-0.5 text-[11px] text-emerald-600/75">
        {state.loading
          ? 'обновление коммерческого курса...'
          : state.error
            ? state.value ? 'показан последний коммерческий курс' : 'курс покупки недоступен'
            : updatedText
              ? `Т-Банк · обновлено ${updatedText}`
              : 'коммерческий курс банка'}
      </div>
    </div>
  );
}