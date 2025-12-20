import type { RequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';
import { InvalidCredentialsError, loginUser, registerUser } from './auth.service';
import { loginSchema, registerSchema } from './auth.validators';

const DUPLICATE_KEY_CODE = 11000;

const formatZodErrors = (error: ZodError) => {
  const { fieldErrors, formErrors } = error.flatten();
  return {
    fieldErrors,
    formErrors,
  };
};

const isDuplicateKeyError = (error: unknown): error is MongoServerError => {
  return (
    error instanceof MongoServerError &&
    typeof error.code === 'number' &&
    error.code === DUPLICATE_KEY_CODE
  );
};

export const registerController: RequestHandler = async (req, res) => {
  try {
    const payload = await registerSchema.parseAsync(req.body);
    const user = await registerUser(payload);

    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation failed', details: formatZodErrors(error) });
    }

    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Log server-side while returning a safe response to the client.
    console.error('RegisterControllerError', error);
    return res.status(500).json({ message: 'Unable to register user at this time' });
  }
};

export const loginController: RequestHandler = async (req, res) => {
  try {
    const payload = await loginSchema.parseAsync(req.body);
    const result = await loginUser(payload);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation failed', details: formatZodErrors(error) });
    }

    if (error instanceof InvalidCredentialsError) {
      return res.status(401).json({ message: error.message });
    }

    console.error('LoginControllerError', error);
    return res.status(500).json({ message: 'Unable to login at this time' });
  }
};
