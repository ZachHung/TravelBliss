import { createFormContext } from '@mantine/form';

export const useFormContext = <V,>() => {
  const [_Provider, getFormContext, _useForm] = createFormContext<V>();
  return getFormContext();
};
