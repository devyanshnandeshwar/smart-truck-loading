import { useCallback, useEffect, useMemo, useState } from 'react';

const shipmentStatuses = ['Pending', 'Optimized', 'Booked', 'In Transit'] as const;

type ShipmentStatus = (typeof shipmentStatuses)[number];

type Shipment = {
  _id: string;
  status: ShipmentStatus;
  weight: number;
  volume: number;
  destination: string;
  deadline: string;
};

type ShipmentListProps = {
  onEdit?: (shipment: Shipment) => void;
  onDelete?: (shipment: Shipment) => void;
};

const statusClassName: Record<ShipmentStatus, string> = {
  Pending: 'status-badge status-pending',
  Optimized: 'status-badge status-optimized',
  Booked: 'status-badge status-booked',
  'In Transit': 'status-badge status-transit',
};

const ShipmentList = ({ onEdit, onDelete }: ShipmentListProps) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    []
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    []
  );

  const fetchShipments = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/shipments', { signal });
        const body = await response.json().catch(() => null);

        if (!response.ok) {
          const message = body?.message ?? 'Unable to load shipments.';
          throw new Error(message);
        }

        const payload = Array.isArray(body?.shipments) ? body.shipments : [];
        const normalized: Shipment[] = payload
          .map((shipment) => {
            const status = shipmentStatuses.includes(shipment.status as ShipmentStatus)
              ? (shipment.status as ShipmentStatus)
              : 'Pending';

            return {
              _id: String(shipment._id ?? ''),
              status,
              weight: Number(shipment.weight ?? 0),
              volume: Number(shipment.volume ?? 0),
              destination: String(shipment.destination ?? ''),
              deadline: String(shipment.deadline ?? ''),
            };
          })
          .filter((shipment) => shipment._id);

        setShipments(normalized);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        const fallback = 'Failed to fetch shipments. Please try again later.';
        setError(error instanceof Error ? error.message : fallback);
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
    fetchShipments(controller.signal);
    return () => controller.abort();
  }, [fetchShipments]);

  const handleEdit = useCallback(
    (shipment: Shipment) => {
      if (onEdit) {
        onEdit(shipment);
      } else {
        console.info('Edit shipment', shipment._id);
      }
    },
    [onEdit]
  );

  const handleDelete = useCallback(
    async (shipment: Shipment) => {
      if (onDelete) {
        onDelete(shipment);
        return;
      }

      try {
        setDeletingId(shipment._id);
        const response = await fetch(`/api/shipments/${shipment._id}`, {
          method: 'DELETE',
        });

        if (!response.ok && response.status !== 204) {
          const errorBody = await response.json().catch(() => null);
          const message = errorBody?.message ?? 'Unable to delete shipment.';
          throw new Error(message);
        }

        await fetchShipments();
      } catch (error) {
        const fallback = 'Unexpected error while deleting shipment.';
        setError(error instanceof Error ? error.message : fallback);
      } finally {
        setDeletingId(null);
      }
    },
    [fetchShipments, onDelete]
  );

  const refresh = useCallback(() => {
    fetchShipments();
  }, [fetchShipments]);

  const renderDeadline = useCallback(
    (deadline: string) => {
      const date = new Date(deadline);
      if (Number.isNaN(date.getTime())) {
        return '—';
      }
      return dateFormatter.format(date);
    },
    [dateFormatter]
  );

  const isEmpty = !isLoading && shipments.length === 0 && !error;

  return (
    <section className="shipment-list">
      <header className="shipment-list__header">
        <div>
          <h2>Shipments</h2>
          <p>Latest shipments for this warehouse.</p>
        </div>
        <button type="button" onClick={refresh} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {isLoading && shipments.length === 0 && <p className="shipment-list__state">Loading shipments…</p>}
      {error && (
        <div className="shipment-list__state shipment-list__state--error">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}
      {isEmpty && <p className="shipment-list__state">No shipments yet. Create your first shipment above.</p>}

      <ul className="shipment-cards">
        {shipments.map((shipment) => (
          <li key={shipment._id} className="shipment-card">
            <div className="shipment-card__header">
              <span className="shipment-card__id">#{shipment._id.slice(-6)}</span>
              <span className={statusClassName[shipment.status]}>{shipment.status}</span>
            </div>

            <div className="shipment-card__details">
              <div>
                <small>Weight</small>
                <strong>{numberFormatter.format(shipment.weight)} kg</strong>
              </div>
              <div>
                <small>Volume</small>
                <strong>{numberFormatter.format(shipment.volume)} m³</strong>
              </div>
              <div>
                <small>Destination</small>
                <strong>{shipment.destination}</strong>
              </div>
              <div>
                <small>Deadline</small>
                <strong>{renderDeadline(shipment.deadline)}</strong>
              </div>
            </div>

            <div className="shipment-card__actions">
              <button type="button" onClick={() => handleEdit(shipment)}>
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(shipment)}
                disabled={deletingId === shipment._id}
              >
                {deletingId === shipment._id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ShipmentList;
