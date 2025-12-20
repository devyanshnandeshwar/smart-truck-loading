import { AxiosError } from 'axios';
import { Field, FieldArray, Form, Formik } from 'formik';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { authApi } from '../api/auth';
import type { RegisterRequest, UserRole } from '../types/auth';

interface RegisterFormValues {
  email: string;
  password: string;
  role: UserRole;
  companyName: string;
  managerName: string;
  location: string;
  truckTypes: string[];
  serviceAreas: string[];
}

const initialValues: RegisterFormValues = {
  email: '',
  password: '',
  role: 'WAREHOUSE',
  companyName: '',
  managerName: '',
  location: '',
  truckTypes: [''],
  serviceAreas: [''],
};

const sharedSchema = {
  email: Yup.string().email('Enter a valid email').required('Email is required'),
  password: Yup.string().min(8, 'Minimum 8 characters').required('Password is required'),
};

const warehouseSchema = Yup.object({
  ...sharedSchema,
  role: Yup.mixed<UserRole>().oneOf(['WAREHOUSE', 'DEALER']).required(),
  companyName: Yup.string().trim().required('Company name is required'),
  managerName: Yup.string().trim().required('Manager name is required'),
  location: Yup.string().trim().required('Location is required'),
  truckTypes: Yup.array().of(Yup.string().trim()).optional(),
  serviceAreas: Yup.array().of(Yup.string().trim()).optional(),
});

const dealerSchema = Yup.object({
  ...sharedSchema,
  role: Yup.mixed<UserRole>().oneOf(['WAREHOUSE', 'DEALER']).required(),
  truckTypes: Yup.array()
    .of(Yup.string().trim().min(1, 'Provide a truck type'))
    .min(1, 'At least one truck type is required'),
  serviceAreas: Yup.array()
    .of(Yup.string().trim().min(1, 'Provide a service area'))
    .min(1, 'At least one service area is required'),
  companyName: Yup.string().optional(),
  managerName: Yup.string().optional(),
  location: Yup.string().optional(),
});

const extractErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? 'Registration failed';
  }

  return 'Registration failed';
};

const resolveArrayError = (error: unknown): string | undefined => {
  if (typeof error === 'string') {
    return error;
  }

  if (Array.isArray(error)) {
    return error.find((entry) => typeof entry === 'string' && entry.length > 0);
  }

  return undefined;
};

const createEmptyArray = () => [''];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('WAREHOUSE');

  const validationSchema = useMemo(() => {
    return selectedRole === 'WAREHOUSE' ? warehouseSchema : dealerSchema;
  }, [selectedRole]);

  const handleRoleSwitch = (
    role: UserRole,
    setFieldValue: (field: string, value: unknown) => void,
    values: RegisterFormValues
  ) => {
    setSelectedRole(role);
    setFieldValue('role', role);

    if (role === 'WAREHOUSE') {
      setFieldValue('truckTypes', createEmptyArray());
      setFieldValue('serviceAreas', createEmptyArray());
    } else {
      setFieldValue('companyName', '');
      setFieldValue('managerName', '');
      setFieldValue('location', '');
      setFieldValue('truckTypes', values.truckTypes?.length ? values.truckTypes : createEmptyArray());
      setFieldValue('serviceAreas', values.serviceAreas?.length ? values.serviceAreas : createEmptyArray());
    }
  };

  const buildPayload = (values: RegisterFormValues): RegisterRequest => {
    if (values.role === 'WAREHOUSE') {
      return {
        email: values.email,
        password: values.password,
        role: 'WAREHOUSE',
        companyName: values.companyName,
        managerName: values.managerName,
        location: values.location,
      };
    }

    const cleanedTruckTypes = values.truckTypes.filter((entry) => entry.trim().length > 0);
    const cleanedServiceAreas = values.serviceAreas.filter((entry) => entry.trim().length > 0);

    return {
      email: values.email,
      password: values.password,
      role: 'DEALER',
      truckTypes: cleanedTruckTypes,
      serviceAreas: cleanedServiceAreas,
    };
  };

  return (
    <section className="card-shell">
      <div className="card-header">
        <p className="eyebrow">Step 1</p>
        <h1>Create an account</h1>
        <p className="lede">
          Choose a role to unlock the inputs tailored for warehouses or dealers. We validate everything on the
          fly so you only submit clean data.
        </p>
      </div>

      <Formik<RegisterFormValues>
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, helpers) => {
          setStatusMessage(null);
          try {
            const payload = buildPayload(values);
            await authApi.register(payload);
            helpers.resetForm();
            setSelectedRole('WAREHOUSE');
            setStatusMessage('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 1200);
          } catch (error) {
            setStatusMessage(extractErrorMessage(error));
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="form-grid">
            <div className="toggle-group">
              <button
                type="button"
                className={selectedRole === 'WAREHOUSE' ? 'toggle active' : 'toggle'}
                onClick={() => handleRoleSwitch('WAREHOUSE', setFieldValue, values)}
              >
                Warehouse
              </button>
              <button
                type="button"
                className={selectedRole === 'DEALER' ? 'toggle active' : 'toggle'}
                onClick={() => handleRoleSwitch('DEALER', setFieldValue, values)}
              >
                Dealer
              </button>
            </div>

            <label className="field">
              <span>Email</span>
              <Field name="email" type="email" placeholder="you@company.com" />
              {touched.email && errors.email ? <small>{errors.email}</small> : null}
            </label>

            <label className="field">
              <span>Password</span>
              <Field name="password" type="password" placeholder="Min 8 characters" />
              {touched.password && errors.password ? <small>{errors.password}</small> : null}
            </label>

            {values.role === 'WAREHOUSE' && (
              <div className="role-grid">
                <label className="field">
                  <span>Company Name</span>
                  <Field name="companyName" placeholder="Atlas Logistics" />
                  {touched.companyName && errors.companyName ? <small>{errors.companyName}</small> : null}
                </label>
                <label className="field">
                  <span>Manager Name</span>
                  <Field name="managerName" placeholder="Jordan Matthews" />
                  {touched.managerName && errors.managerName ? <small>{errors.managerName}</small> : null}
                </label>
                <label className="field">
                  <span>Location</span>
                  <Field name="location" placeholder="Denver, CO" />
                  {touched.location && errors.location ? <small>{errors.location}</small> : null}
                </label>
              </div>
            )}

            {values.role === 'DEALER' && (
              <div className="role-grid">
                <FieldArray name="truckTypes">
                  {(arrayHelpers) => {
                    const message = resolveArrayError(errors.truckTypes as unknown);
                    return (
                      <div className="field">
                        <span>Truck Types</span>
                        {values.truckTypes.map((_, index) => (
                          <div key={`truck-${index}`} className="chip-row">
                            <Field name={`truckTypes.${index}`} placeholder="Flatbed" />
                            {values.truckTypes.length > 1 && (
                              <button type="button" onClick={() => arrayHelpers.remove(index)}>
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => arrayHelpers.push('')} className="ghost">
                          Add truck type
                        </button>
                        {touched.truckTypes && message ? <small>{message}</small> : null}
                      </div>
                    );
                  }}
                </FieldArray>

                <FieldArray name="serviceAreas">
                  {(arrayHelpers) => {
                    const message = resolveArrayError(errors.serviceAreas as unknown);
                    return (
                      <div className="field">
                        <span>Service Areas</span>
                        {values.serviceAreas.map((_, index) => (
                          <div key={`service-${index}`} className="chip-row">
                            <Field name={`serviceAreas.${index}`} placeholder="Southwest" />
                            {values.serviceAreas.length > 1 && (
                              <button type="button" onClick={() => arrayHelpers.remove(index)}>
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => arrayHelpers.push('')} className="ghost">
                          Add service area
                        </button>
                        {touched.serviceAreas && message ? <small>{message}</small> : null}
                      </div>
                    );
                  }}
                </FieldArray>
              </div>
            )}

            <button type="submit" className="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>

            {statusMessage ? <p className="status">{statusMessage}</p> : null}
          </Form>
        )}
      </Formik>
    </section>
  );
};

export default RegisterPage;
