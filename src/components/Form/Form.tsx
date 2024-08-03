import { Box } from '@mantine/core';
import { useForm, UseFormInput, UseFormReturnType } from '@mantine/form';
import { isFunction } from 'lodash';

type FormProps<V extends Record<string, any>> = UseFormInput<V> & {
  onSubmit: (values: V, event: React.FormEvent<HTMLFormElement> | undefined) => void;
  children: (formData: UseFormReturnType<V>) => JSX.Element | JSX.Element;
};

const Form = <V extends Record<string, any>>({
  children,
  onSubmit,
  ...useFormInput
}: FormProps<V>) => {
  const form = useForm(useFormInput);
  return (
    <Box p={16}>
      <form onSubmit={form.onSubmit(onSubmit)}>
        {isFunction(children) ? children(form) : children}
      </form>
    </Box>
  );
};

export default Form;
