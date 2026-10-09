import { useState, useEffect, useCallback } from 'react';
import { fetchTemporalForecast } from '../lib/api-client';
import type { TemporalForecastResponse } from '../lib/api-client';

export function useTemporalForecast(sectorId?: string | number | null, horizonHours: number = 24) {
  const [data, setData] = useState<TemporalForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadForecast = useCallback(async () => {
    if (!sectorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTemporalForecast(String(sectorId), horizonHours);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Chronos temporal forecast');
    } finally {
      setLoading(false);
    }
  }, [sectorId, horizonHours]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  return {
    forecast: data,
    loading,
    error,
    refetch: loadForecast,
  };
}
