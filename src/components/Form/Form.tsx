import React, { useCallback } from 'react';
import { CombinedGraphQLErrors } from '@apollo/client';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import { Box, Button, Center, Stack, type MantineStyleProps } from '@mantine/core';
import { useForm, type UseFormInput, type UseFormReturnType } from '@mantine/form';
import { type ErrorsCodes } from '@/types';

export type FormError<V> = {
  [key in ErrorsCodes]?: {
    message: string;
    fieldName: keyof V;
  }[];
};

type FormProps<V extends Record<string, any>> = UseFormInput<V> & {
  onSubmit: (values: V, event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
  formErrors?: FormError<V>;
  children: ((formData: UseFormReturnType<V>) => React.ReactElement) | React.ReactElement;
  loading?: boolean;
  footer?: React.ReactElement;
  submitLabel?: string;
  submitFullWidth?: boolean;
} & Pick<MantineStyleProps, 'w'>;

const Form = <V extends Record<string, any>>({
  children,
  onSubmit,
  formErrors,
  footer,
  submitLabel,
  loading,
  submitFullWidth,
  w,
  ...useFormInput
}: FormProps<V>) => {
  const form = useForm<V>({ ...useFormInput, mode: 'uncontrolled' });

  const handleFormError = useCallback(
    (error: CombinedGraphQLErrors) => {
      if (isEmpty(formErrors)) {
        return;
      }

      const exceptions = error.errors.map((graphError) => ({
        code: graphError.extensions?.code as ErrorsCodes,
        where: graphError.extensions?.where as keyof V,
      }));

      for (const exceptionInfo of exceptions) {
        const errors = formErrors[exceptionInfo.code];
        if (errors) {
          for (const exception of errors) {
            form.setFieldError(
              String(exceptionInfo.where || exception.fieldName),
              exception.message
            );
          }
        }
      }
    },
    [formErrors]
  );

  const handleFormSubmit = async (
    values: V,
    event: React.FormEvent<HTMLFormElement> | undefined
  ) => {
    try {
      await onSubmit(values, event);
    } catch (e) {
      if (CombinedGraphQLErrors.is(e)) {
        handleFormError(e);
      }
    }
  };

  return (
    <Box p={16}>
      <form onSubmit={form.onSubmit(handleFormSubmit)}>
        <Stack w={w || 360} justify="center">
          {isFunction(children) ? children(form) : children}
          <Center>
            <Button
              type="submit"
              fw="normal"
              mt="md"
              loading={loading}
              w={submitFullWidth ? '100%' : '25%'}
            >
              {submitLabel || 'Submit'}
            </Button>
          </Center>
          {footer}
        </Stack>
      </form>
    </Box>
  );
};

export default Form;
