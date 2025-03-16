import React, { useCallback } from 'react';
import { ApolloError } from '@apollo/client';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import { Box, Button, Center, MantineStyleProps, Stack } from '@mantine/core';
import { createFormContext, UseFormInput, UseFormReturnType } from '@mantine/form';
import { ErrorsCodes } from '@/types';

export type FormError<V> = {
  [key in ErrorsCodes]?: {
    message: string;
    fieldName: keyof V;
  }[];
};

type FormProps<V> = UseFormInput<V> & {
  onSubmit: (values: V, event?: React.FormEvent<HTMLFormElement>) => Promise<void>;
  formErrors?: FormError<V>;
  children: (formData: UseFormReturnType<V>) => JSX.Element | JSX.Element;
  loading?: boolean;
  footer?: JSX.Element;
  submitLabel?: string;
  submitFullWidth?: boolean;
} & Pick<MantineStyleProps, 'w'>;

const Form = <V,>({
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
  const [FormProvider, _, useForm] = createFormContext<V>();

  const form = useForm({ ...useFormInput, mode: 'uncontrolled' });

  const handleFormError = useCallback(
    (error: ApolloError) => {
      if (isEmpty(formErrors)) {
        return;
      }

      const exceptions = error.graphQLErrors.map((graphError) => ({
        code: graphError.extensions?.code as ErrorsCodes,
        where: graphError.extensions?.where as keyof V,
      }));

      for (const exceptionInfo of exceptions) {
        const errors = formErrors[exceptionInfo.code];
        if (errors) {
          for (const exception of errors) {
            form.setFieldError(exceptionInfo.where || exception.fieldName, exception.message);
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
      if (e instanceof ApolloError) {
        handleFormError(e);
      }
    }
  };

  return (
    <Box p={16}>
      <FormProvider form={form}>
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
      </FormProvider>
    </Box>
  );
};

export default Form;
