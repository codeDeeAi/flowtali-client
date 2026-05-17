import * as yup from 'yup';

type ValidationErrors = Record<string, string[]>;

type ValidateResult<T> =
  | { valid: true; data: T; errors: null }
  | { valid: false; data: null; errors: ValidationErrors };

export function useYupForm() {

  const validate = async <T extends yup.Maybe<yup.AnyObject>>(
    schema: yup.Schema<T>,
    data: any
  ): Promise<ValidateResult<T>> => {

    try {

      const validatedData = await schema.validate(data, { abortEarly: false });

      return { valid: true, data: validatedData, errors: null };

    } catch (err) {
      const errors: ValidationErrors = {};

      if (err instanceof yup.ValidationError) {

        if (err.inner && err.inner.length > 0) {
          err.inner.forEach((validationError) => {
            const path = validationError.path;

            if (path) {
              if (!errors[path]) {
                errors[path] = [];
              }
              errors[path].push(validationError.message);
            }
          });
        }
        else if (err.path) {
          errors[err.path] = [err.message];
        }
      }

      return { valid: false, data: null, errors };
    }
  };

  return {
    validate
  };
}
