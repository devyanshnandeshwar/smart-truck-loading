import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

const shipmentSchema = z.object({
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
});

type ShipmentFormState = {
  weight: string;
  volume: string;
  destination: string;
  deadline: string;
};

type ShipmentPayload = z.infer<typeof shipmentSchema>;

type FieldErrors = Partial<Record<keyof ShipmentFormState, string>>;

const initialState: ShipmentFormState = {
  weight: '',
  volume: '',
  destination: '',
  deadline: '',
};

const buildPayload = (data: ShipmentPayload) => ({
  weight: data.weight,
  volume: data.volume,
  destination: data.destination,
  deadline: data.deadline.toISOString(),
});

const AddShipmentForm = () => {
  const [formState, setFormState] = useState<ShipmentFormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const validate = useCallback((state: ShipmentFormState) => {
    const result = shipmentSchema.safeParse(state);

    if (!result.success) {
      const nextErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field === 'string') {
          nextErrors[field as keyof ShipmentFormState] = issue.message;
        }
      });

      setFieldErrors(nextErrors);
      return null;
    }

    setFieldErrors({});
    return buildPayload(result.data);
  }, []);

  const resetForm = useCallback(() => {
    setFormState(initialState);
    setFieldErrors({});
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setIsSubmitting(true);
      setFormError(null);
      setSuccessMessage(null);

      const payload = validate(formState);

      if (!payload) {
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await fetch('/api/shipments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          const message = errorBody?.message ?? 'Failed to create shipment. Please try again.';
          throw new Error(message);
        }

        resetForm();
        setSuccessMessage('Shipment created successfully.');
      } catch (error) {
        const fallback = 'Unexpected error while creating shipment.';
        setFormError(error instanceof Error ? error.message : fallback);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState, resetForm, validate]
  );

  const isSubmitDisabled = useMemo(() => {
    if (isSubmitting) {
      return true;
    }

    return !formState.weight || !formState.volume || !formState.destination || !formState.deadline;
  }, [formState, isSubmitting]);

  return (
    <form onSubmit={handleSubmit} className="add-shipment-form" noValidate>
      <fieldset disabled={isSubmitting}>
        <legend>Add Shipment</legend>

        <label>
          Weight (kg)
          <input
            type="number"
            name="weight"
            value={formState.weight}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="Enter shipment weight"
            required
          />
          {fieldErrors.weight && <span className="field-error">{fieldErrors.weight}</span>}
        </label>

        <label>
          Volume (m³)
          <input
            type="number"
            name="volume"
            value={formState.volume}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="Enter shipment volume"
            required
          />
          {fieldErrors.volume && <span className="field-error">{fieldErrors.volume}</span>}
        </label>

        <label>
          Destination
          <input
            type="text"
            name="destination"
            value={formState.destination}
            onChange={handleChange}
            placeholder="Enter destination"
            required
          />
          {fieldErrors.destination && <span className="field-error">{fieldErrors.destination}</span>}
        </label>

        <label>
          Deadline
          <input
            type="datetime-local"
            name="deadline"
            value={formState.deadline}
            onChange={handleChange}
            required
          />
          {fieldErrors.deadline && <span className="field-error">{fieldErrors.deadline}</span>}
        </label>

        <button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? 'Saving...' : 'Add Shipment'}
        </button>
      </fieldset>

      {formError && <p className="form-error" role="alert">{formError}</p>}
      {successMessage && <p className="form-success">{successMessage}</p>}
    </form>
  );
};

export default AddShipmentForm;
