/**
 * Form — binds a `useForm` instance to its fields without threading `form`
 * through every one of them by hand.
 *
 * `Form.Field` is a render prop, not a component that clones its child, for
 * the same reason `useField` is a hook and not a wrapper: PanelUI's controls
 * take differently-shaped change props, and only the caller knows which one
 * a given field needs to wire up.
 *
 * `Form`/`Form.Field` trade some type precision for that JSX ergonomics — a
 * field's `name` isn't checked against `keyof YourValues` here, because a
 * value's shape can't flow through `useContext` generically. Reach for
 * `useField(form, name)` directly when a field's name should be checked
 * against the form's own value type.
 *
 * ```tsx
 * const form = useForm({
 *   defaultValues: { email: '' },
 *   onSubmit: async (values) => { ... },
 * });
 *
 * <Form form={form}>
 *   <Form.Field name="email" validate={(value) => (value ? undefined : 'Required')}>
 *     {(field) => (
 *       <Input
 *         label="Email"
 *         value={field.value}
 *         onChangeText={field.onChange}
 *         onBlur={field.onBlur}
 *         errorMessage={field.error}
 *       />
 *     )}
 *   </Form.Field>
 * </Form>
 * ```
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useField, type FormFieldRenderProps, type UseFieldOptions } from './use-field';
import { useForm, type FormApi, type FieldErrors, type FieldTouched, type FieldState, type UseFormOptions, type Validator } from './use-form';

export { useForm, useField };
export type {
  FormApi,
  FieldErrors,
  FieldTouched,
  FieldState,
  UseFormOptions,
  Validator,
  FormFieldRenderProps,
  UseFieldOptions,
};

const FormContext = createContext<FormApi<any> | null>(null);

export interface FormProps {
  form: FormApi<any>;
  children?: ReactNode;
}

function FormRoot({ form, children }: FormProps) {
  return <FormContext.Provider value={form}>{children}</FormContext.Provider>;
}
FormRoot.displayName = 'Form';

export interface FormFieldProps {
  name: string;
  validate?: (value: any, values: any) => string | undefined | Promise<string | undefined>;
  /** Runs on blur, and always on submit. `'change'` also validates on every edit. */
  validateOn?: 'blur' | 'change';
  children: (field: FormFieldRenderProps<any>) => ReactNode;
}

function FormField({ name, validate, validateOn, children }: FormFieldProps) {
  const form = useContext(FormContext);
  if (!form) {
    throw new Error('Form.Field must be rendered inside a <Form>.');
  }
  const field = useField(form, name, { validate, validateOn });
  return <>{children(field)}</>;
}
FormField.displayName = 'Form.Field';

export const Form = Object.assign(FormRoot, {
  Field: FormField,
});
