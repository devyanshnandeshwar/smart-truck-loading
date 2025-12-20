import { AxiosError } from 'axios';
import { Field, Form, Formik } from 'formik';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { authApi } from '../api/auth';
import { authStorage } from '../utils/authStorage';

interface LoginFormValues {
  email: string;
  password: string;
}

const loginSchema = Yup.object({
  email: Yup.string().email('Enter a valid email').required('Email is required'),
  password: Yup.string().min(8, 'Minimum 8 characters').required('Password is required'),
});

const extractErrorMessage = (error: unknown) => {
  if (error instanceof AxiosError) {
    return error.response?.data?.message ?? 'Login failed';
  }

  return 'Login failed';
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  return (
    <section className="card-shell">
      <div className="card-header">
        <p className="eyebrow">Step 2</p>
        <h1>Sign in</h1>
        <p className="lede">Authenticate to grab fresh tokens. We keep them in localStorage for now.</p>
      </div>

      <Formik<LoginFormValues>
        initialValues={{ email: '', password: '' }}
        validationSchema={loginSchema}
        onSubmit={async (values, helpers) => {
          setStatusMessage(null);
          try {
            const { tokens, user } = await authApi.login(values);
            authStorage.setAuth({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              role: user.role,
            });
            helpers.resetForm();
            setStatusMessage('Login successful. Redirecting...');
            setTimeout(() => navigate('/welcome', { replace: true }), 800);
          } catch (error) {
            setStatusMessage(extractErrorMessage(error));
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ errors, touched, isSubmitting }) => (
          <Form className="form-grid">
            <label className="field">
              <span>Email</span>
              <Field name="email" type="email" placeholder="you@company.com" />
              {touched.email && errors.email ? <small>{errors.email}</small> : null}
            </label>

            <label className="field">
              <span>Password</span>
              <Field name="password" type="password" placeholder="••••••••" />
              {touched.password && errors.password ? <small>{errors.password}</small> : null}
            </label>

            <button type="submit" className="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            {statusMessage ? <p className="status">{statusMessage}</p> : null}
          </Form>
        )}
      </Formik>
    </section>
  );
};

export default LoginPage;
