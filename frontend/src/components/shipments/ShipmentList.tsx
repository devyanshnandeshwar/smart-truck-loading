import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

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

type ShipmentEditState = {
  weight: string;
  volume: string;
  destination: string;
  deadline: string;
  status: ShipmentStatus;
};

type ShipmentEditErrors = Partial<Record<keyof ShipmentEditState, string>>;

const editShipmentSchema = z.object({
  weight: z.coerce
    .number({ message: 'Weight is required' })
    .positive('Weight must be greater than zero'),
  volume: z.coerce
    .number({ message: 'Volume is required' })
    .positive('Volume must be greater than zero'),
  destination: z
    .string()
    .trim()
    .min(1, 'Destination is required'),
  deadline: z.coerce.date({ message: 'Deadline must be a valid date and time' }),
  status: z.enum(shipmentStatuses, { message: 'Status is invalid' }),
});

type EditShipmentFormValues = z.infer<typeof editShipmentSchema>;

const buildUpdatePayload = (data: EditShipmentFormValues) => ({
  weight: data.weight,
  volume: data.volume,
  destination: data.destination,
  deadline: data.deadline.toISOString(),
  status: data.status,
});

type ShipmentUpdatePayload = ReturnType<typeof buildUpdatePayload>;

const editableFields: Array<keyof ShipmentEditState> = ['weight', 'volume', 'destination', 'deadline', 'status'];

const statusClassName: Record<ShipmentStatus, string> = {
  Pending: 'status-badge status-pending',
  Optimized: 'status-badge status-optimized',
  Booked: 'status-badge status-booked',
  'In Transit': 'status-badge status-transit',
};

const getStatusOptions = (current: ShipmentStatus) => {
  const currentIndex = shipmentStatuses.indexOf(current);

  if (currentIndex === -1) {
    return shipmentStatuses;
  }

  const next = shipmentStatuses[currentIndex + 1];
  return next ? [current, next] : [current];
};

const toLocalInputValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (input: number) => input.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const ShipmentList = ({ onEdit, onDelete }: ShipmentListProps = {}) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormState, setEditFormState] = useState<ShipmentEditState | null>(null);
  const [editErrors, setEditErrors] = useState<ShipmentEditErrors>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [editBaselineStatus, setEditBaselineStatus] = useState<ShipmentStatus | null>(null);

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
          .map((shipment: any) => {
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
          .filter((shipment: Shipment) => shipment._id);

        setShipments(normalized);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          return;
        }

        const fallback = 'Failed to fetch shipments. Please try again later.';
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
    fetchShipments(controller.signal);
    return () => controller.abort();
  }, [fetchShipments]);

  const closeEditor = useCallback(() => {
    setEditingId(null);
    setEditFormState(null);
    setEditErrors({});
    setEditBaselineStatus(null);
  }, []);

  const startEditing = useCallback(
    (shipment: Shipment) => {
      if (editingId === shipment._id) {
        closeEditor();
        return;
      }

      setEditingId(shipment._id);
      setEditFormState({
        weight: shipment.weight.toString(),
        volume: shipment.volume.toString(),
        destination: shipment.destination,
        deadline: toLocalInputValue(shipment.deadline),
        status: shipment.status,
      });
      setEditErrors({});
      setConfirmDeleteId(null);
      setError(null);
      setEditBaselineStatus(shipment.status);
    },
    [closeEditor, editingId]
  );

  const handleEditChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    if (!editableFields.includes(name as keyof ShipmentEditState)) {
      return;
    }

    const fieldName = name as keyof ShipmentEditState;

    setEditFormState((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        [fieldName]: fieldName === 'status' ? (value as ShipmentStatus) : value,
      };
    });

    setEditErrors((prev) => ({ ...prev, [fieldName]: undefined }));
  }, []);

  const validateEditForm = useCallback(
    (state: ShipmentEditState | null) => {
      if (!state) {
        return null;
      }

      const result = editShipmentSchema.safeParse(state);

      if (!result.success) {
        const nextErrors: ShipmentEditErrors = {};
        result.error.issues.forEach((issue) => {
          const field = issue.path[0];
          if (typeof field === 'string' && editableFields.includes(field as keyof ShipmentEditState)) {
            nextErrors[field as keyof ShipmentEditState] = issue.message;
          }
        });
        setEditErrors(nextErrors);
        return null;
      }

      setEditErrors({});
      return buildUpdatePayload(result.data);
    },
    []
  );

  const handleUpdate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!editingId || !editFormState) {
        return;
      }

      const payload = validateEditForm(editFormState);

      if (!payload) {
        return;
      }

      try {
        setIsUpdating(true);
        setError(null);

        const requestPayload: Partial<ShipmentUpdatePayload> = { ...payload };
        if (editBaselineStatus && requestPayload.status === editBaselineStatus) {
          delete requestPayload.status;
        }

        const response = await fetch(`/api/shipments/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
        });

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          const message = body?.message ?? 'Unable to update shipment.';
          throw new Error(message);
        }

        const currentShipment = shipments.find((shipment) => shipment._id === editingId);
        if (currentShipment) {
          const nextShipment = {
            ...currentShipment,
            ...requestPayload,
          } as Shipment;

          onEdit?.(nextShipment);
        }

        await fetchShipments();
        closeEditor();
      } catch (updateError) {
        const fallback = 'Unexpected error while updating shipment.';
        setError(updateError instanceof Error ? updateError.message : fallback);
      } finally {
        setIsUpdating(false);
      }
    },
    [closeEditor, editBaselineStatus, editFormState, editingId, fetchShipments, onEdit, shipments, validateEditForm]
  );

  const requestDelete = useCallback((shipment: Shipment) => {
    if (shipment.status === 'In Transit') {
      return;
    }

    setConfirmDeleteId(shipment._id);
    setError(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  const handleDelete = useCallback(
    async (shipment: Shipment) => {
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

        setConfirmDeleteId(null);
        await fetchShipments();
        onDelete?.(shipment);
      } catch (deleteError) {
        const fallback = 'Unexpected error while deleting shipment.';
        setError(deleteError instanceof Error ? deleteError.message : fallback);
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
        {shipments.map((shipment) => {
          const isEditing = editingId === shipment._id;
          const isDeleteDisabled = shipment.status === 'In Transit' || deletingId === shipment._id;
          const isConfirmingDelete = confirmDeleteId === shipment._id;
          const statusOptions = getStatusOptions(shipment.status);

          return (
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
              <button type="button" onClick={() => startEditing(shipment)} disabled={isUpdating && isEditing}>
                {isEditing ? 'Close' : 'Edit'}
              </button>

              {isConfirmingDelete ? (
                <span className="shipment-card__confirm">
                  <button
                    type="button"
                    onClick={() => handleDelete(shipment)}
                    disabled={deletingId === shipment._id}
                  >
                    {deletingId === shipment._id ? 'Deleting…' : 'Confirm'}
                  </button>
                  <button type="button" onClick={cancelDelete} disabled={deletingId === shipment._id}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => requestDelete(shipment)}
                  disabled={isDeleteDisabled}
                >
                  {shipment.status === 'In Transit' ? 'Locked' : 'Delete'}
                </button>
              )}
            </div>
            {shipment.status === 'In Transit' && (
              <p className="shipment-card__hint">Shipments in transit cannot be deleted.</p>
            )}

            {isEditing && editFormState && (
              <form className="shipment-card__edit" onSubmit={handleUpdate} noValidate>
                <div className="shipment-card__edit-grid">
                  <label>
                    Weight (kg)
                    <input
                      type="number"
                      name="weight"
                      min="0"
                      step="0.01"
                      value={editFormState.weight}
                      onChange={handleEditChange}
                      required
                    />
                    {editErrors.weight && <span className="field-error">{editErrors.weight}</span>}
                  </label>

                  <label>
                    Volume (m³)
                    <input
                      type="number"
                      name="volume"
                      min="0"
                      step="0.01"
                      value={editFormState.volume}
                      onChange={handleEditChange}
                      required
                    />
                    {editErrors.volume && <span className="field-error">{editErrors.volume}</span>}
                  </label>

                  <label>
                    Destination
                    <input
                      type="text"
                      name="destination"
                      value={editFormState.destination}
                      onChange={handleEditChange}
                      required
                    />
                    {editErrors.destination && <span className="field-error">{editErrors.destination}</span>}
                  </label>

                  <label>
                    Deadline
                    <input
                      type="datetime-local"
                      name="deadline"
                      value={editFormState.deadline}
                      onChange={handleEditChange}
                      required
                    />
                    {editErrors.deadline && <span className="field-error">{editErrors.deadline}</span>}
                  </label>

                  <label>
                    Status
                    <select name="status" value={editFormState.status} onChange={handleEditChange}>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status === shipment.status ? `${status} (current)` : status}
                        </option>
                      ))}
                    </select>
                    {editErrors.status && <span className="field-error">{editErrors.status}</span>}
                  </label>
                </div>

                <div className="shipment-card__edit-actions">
                  <button type="button" onClick={closeEditor} disabled={isUpdating}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isUpdating}>
                    {isUpdating ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}
          </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ShipmentList;
