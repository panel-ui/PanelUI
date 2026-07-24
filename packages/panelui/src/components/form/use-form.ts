/**
 * useForm — form state for React Native, with no form library underneath.
 *
 * Values, errors and touched state live in one `useReducer` so a single
 * dispatch can update more than one of them atomically — setting a value
 * also clears that field's error in the same update, so a field being fixed
 * never flashes invalid for one extra frame while the two states catch up
 * with each other.
 *
 * Per-field validators are not passed in here. They register themselves —
 * `useField`/`Form.Field` do this — because the field that owns the
 * validation rule is usually rendered far from the `useForm` call, and
 * threading every field's validator up to one options object would mean
 * `useForm`'s call site has to know about every field in the tree. What is
 * passed in here (`validate`) is whole-form validation: cross-field rules
 * like "confirm password must match password".
 *
 * Only flat, JSON-serializable values are supported — string, number,
 * boolean, and plain arrays/objects of those. There is no field-array helper
 * (`useFieldArray`) in this version; model a repeating group with your own
 * `useState` array of ids and one `useForm` per row, or key a field's name
 * with an index (`"emails.0"`) and treat it as an opaque string.
 *
 * `defaultValues` is read once, on the first render. If default values
 * arrive asynchronously, mount the form once you have them (e.g. behind a
 * loading check) rather than expecting the hook to pick up a later change.
 */
import { useCallback, useMemo, useReducer, useRef } from 'react';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;
export type FieldTouched<T> = Partial<Record<keyof T, boolean>>;

export type Validator<T extends Record<string, any>, K extends keyof T> = (
  value: T[K],
  values: T
) => string | undefined | Promise<string | undefined>;

export interface FieldState<V> {
  value: V;
  error?: string;
  touched: boolean;
}

export interface UseFormOptions<T extends Record<string, any>> {
  defaultValues: T;
  /** Whole-form validation, e.g. a rule that compares two fields. Runs on submit. */
  validate?: (values: T) => FieldErrors<T> | Promise<FieldErrors<T>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export interface FormApi<T extends Record<string, any>> {
  values: T;
  errors: FieldErrors<T>;
  touched: FieldTouched<T>;
  isSubmitting: boolean;
  /** No field currently carries a validation error. Fields validate on blur and
   * submit, so this does not guarantee an untouched field would pass. */
  isValid: boolean;
  /** `values` differs from `defaultValues`, compared as JSON. */
  isDirty: boolean;
  setFieldValue: <K extends keyof T>(name: K, value: T[K]) => void;
  setFieldTouched: <K extends keyof T>(name: K, touched?: boolean) => void;
  setFieldError: <K extends keyof T>(name: K, error: string | undefined) => void;
  getFieldState: <K extends keyof T>(name: K) => FieldState<T[K]>;
  /** Used by `useField`/`Form.Field` to attach a field's validation rule. */
  registerValidator: <K extends keyof T>(name: K, validator?: Validator<T, K>) => void;
  /** Runs `name`'s registered validator (if any) and records the result. */
  validateField: <K extends keyof T>(name: K) => Promise<boolean>;
  handleSubmit: () => Promise<void>;
  reset: (values?: T) => void;
}

interface State<T> {
  values: T;
  errors: FieldErrors<T>;
  touched: FieldTouched<T>;
  isSubmitting: boolean;
}

type Action<T> =
  | { type: 'SET_VALUE'; name: keyof T; value: unknown }
  | { type: 'SET_TOUCHED'; name: keyof T; touched: boolean }
  | { type: 'SET_ERROR'; name: keyof T; error: string | undefined }
  | { type: 'SET_ERRORS'; errors: FieldErrors<T> }
  | { type: 'TOUCH_ALL'; names: (keyof T)[] }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' }
  | { type: 'RESET'; values: T };

function reducer<T extends Record<string, any>>(
  state: State<T>,
  action: Action<T>
): State<T> {
  switch (action.type) {
    case 'SET_VALUE':
      return {
        ...state,
        values: { ...state.values, [action.name]: action.value } as T,
        errors: { ...state.errors, [action.name]: undefined },
      };
    case 'SET_TOUCHED':
      return {
        ...state,
        touched: { ...state.touched, [action.name]: action.touched },
      };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.name]: action.error } };
    case 'SET_ERRORS':
      return { ...state, errors: { ...state.errors, ...action.errors } };
    case 'TOUCH_ALL': {
      const touched = { ...state.touched };
      for (const name of action.names) touched[name] = true;
      return { ...state, touched };
    }
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };
    case 'SUBMIT_END':
      return { ...state, isSubmitting: false };
    case 'RESET':
      return { values: action.values, errors: {}, touched: {}, isSubmitting: false };
    default:
      return state;
  }
}

export function useForm<T extends Record<string, any>>({
  defaultValues,
  validate,
  onSubmit,
}: UseFormOptions<T>): FormApi<T> {
  const defaultsRef = useRef(defaultValues);
  const validatorsRef = useRef<
    Partial<Record<keyof T, (value: any, values: T) => string | undefined | Promise<string | undefined>>>
  >({});

  const [state, dispatch] = useReducer(reducer<T>, {
    values: defaultValues,
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  const setFieldValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    dispatch({ type: 'SET_VALUE', name, value });
  }, []);

  const setFieldTouched = useCallback(<K extends keyof T>(name: K, touched = true) => {
    dispatch({ type: 'SET_TOUCHED', name, touched });
  }, []);

  const setFieldError = useCallback(
    <K extends keyof T>(name: K, error: string | undefined) => {
      dispatch({ type: 'SET_ERROR', name, error });
    },
    []
  );

  const registerValidator = useCallback(
    <K extends keyof T>(name: K, validator?: Validator<T, K>) => {
      if (validator) {
        validatorsRef.current[name] = validator;
      } else {
        delete validatorsRef.current[name];
      }
    },
    []
  );

  const getFieldState = useCallback(
    <K extends keyof T>(name: K): FieldState<T[K]> => ({
      value: state.values[name],
      error: state.errors[name],
      touched: !!state.touched[name],
    }),
    [state.values, state.errors, state.touched]
  );

  const validateField = useCallback(
    async <K extends keyof T>(name: K) => {
      const validator = validatorsRef.current[name];
      if (!validator) return true;
      const error = await validator(state.values[name], state.values);
      dispatch({ type: 'SET_ERROR', name, error });
      return !error;
    },
    [state.values]
  );

  const handleSubmit = useCallback(async () => {
    const names = Object.keys(state.values) as (keyof T)[];
    dispatch({ type: 'TOUCH_ALL', names });

    const fieldErrorEntries = await Promise.all(
      names.map(async (name) => {
        const validator = validatorsRef.current[name];
        const error = validator
          ? await validator(state.values[name], state.values)
          : undefined;
        return [name, error] as const;
      })
    );

    const formErrors = validate ? await validate(state.values) : {};

    const cleared = Object.fromEntries(names.map((name) => [name, undefined]));
    const nextErrors: FieldErrors<T> = {
      ...cleared,
      ...Object.fromEntries(fieldErrorEntries.filter(([, error]) => error !== undefined)),
      ...formErrors,
    };
    dispatch({ type: 'SET_ERRORS', errors: nextErrors });

    if (Object.values(nextErrors).some(Boolean)) return;

    dispatch({ type: 'SUBMIT_START' });
    try {
      await onSubmit(state.values);
    } finally {
      dispatch({ type: 'SUBMIT_END' });
    }
  }, [state.values, validate, onSubmit]);

  const reset = useCallback((values: T = defaultsRef.current) => {
    dispatch({ type: 'RESET', values });
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(state.values) !== JSON.stringify(defaultsRef.current),
    [state.values]
  );
  const isValid = useMemo(
    () => Object.values(state.errors).every((error) => !error),
    [state.errors]
  );

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValid,
    isDirty,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    getFieldState,
    registerValidator,
    validateField,
    handleSubmit,
    reset,
  };
}
