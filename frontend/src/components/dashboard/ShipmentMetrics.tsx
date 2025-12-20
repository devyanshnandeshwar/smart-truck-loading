import { useCallback, useEffect, useMemo, useState } from 'react';

type ShipmentMetrics = {
  totalShipments: number;
  optimizedShipments: number;
  pendingShipments: number;
  optimizationPercentage: number;
};

const defaultMetrics: ShipmentMetrics = {
  totalShipments: 0,
  optimizedShipments: 0,
  pendingShipments: 0,
  optimizationPercentage: 0,
};

const metricDescriptions: Record<keyof ShipmentMetrics, string> = {
  totalShipments: 'All shipments created for this warehouse',
  optimizedShipments: 'Shipments already optimized',
  pendingShipments: 'Shipments awaiting optimization',
  optimizationPercentage: 'Share of shipments that are optimized',
};

const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

const normalizeMetrics = (metrics: Partial<ShipmentMetrics> | null | undefined): ShipmentMetrics => ({
  totalShipments: Number(metrics?.totalShipments ?? 0),
  optimizedShipments: Number(metrics?.optimizedShipments ?? 0),
  pendingShipments: Number(metrics?.pendingShipments ?? 0),
  optimizationPercentage: Number(metrics?.optimizationPercentage ?? 0),
});

const ShipmentMetrics = () => {
  const [metrics, setMetrics] = useState<ShipmentMetrics>(defaultMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/shipments/metrics', { signal });
        const body = await response.json().catch(() => null);

        if (!response.ok) {
          const message = body?.message ?? 'Unable to load shipment metrics.';
          throw new Error(message);
        }

        setMetrics(normalizeMetrics(body?.metrics));
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return;
        }

        const fallback = 'Failed to fetch shipment metrics. Please try again later.';
        setError(fetchError instanceof Error ? fetchError.message : fallback);
      } finally {
        if (!signal || !signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchMetrics(controller.signal);
    return () => controller.abort();
  }, [fetchMetrics]);

  const refresh = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const cards = useMemo(
    () => [
      {
        key: 'totalShipments' as const,
        title: 'Total Shipments',
        value: metrics.totalShipments.toLocaleString(),
      },
      {
        key: 'optimizationPercentage' as const,
        title: 'Optimized %',
        value: formatPercentage(metrics.optimizationPercentage),
      },
      {
        key: 'pendingShipments' as const,
        title: 'Pending Shipments',
        value: metrics.pendingShipments.toLocaleString(),
      },
    ],
    [metrics]
  );

  return (
    <section className="shipment-metrics">
      <header className="shipment-metrics__header">
        <div>
          <p className="shipment-metrics__eyebrow">Warehouse snapshot</p>
          <h2>Shipment Metrics</h2>
        </div>
        <button type="button" onClick={refresh} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && (
        <div className="shipment-metrics__state shipment-metrics__state--error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      <div className="shipment-metrics__grid" aria-busy={isLoading} aria-live="polite">
        {cards.map((card) => (
          <article key={card.key} className="shipment-metrics__card">
            <p className="shipment-metrics__label">{card.title}</p>
            <p className="shipment-metrics__value">{card.value}</p>
            <p className="shipment-metrics__description">{metricDescriptions[card.key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ShipmentMetrics;
