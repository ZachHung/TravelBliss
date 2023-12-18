import { useForm, UseFormInput, UseFormReturnType } from '@mantine/form';

type FormProps<V> = UseFormInput<V> & {
  onSubmit: (values: V, event: React.FormEvent<HTMLFormElement> | undefined) => void;
  children: (formData: UseFormReturnType<V>) => JSX.Element;
};

const Form = <V,>({ children, onSubmit: handleSubmit, ...useFormInput }: FormProps<V>) => {
  const form = useForm(useFormInput);
  return <form onSubmit={form.onSubmit(handleSubmit)}>{children(form)}</form>;
};

export default Form;
