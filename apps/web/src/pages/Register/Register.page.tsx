import dayjs from 'dayjs';
import { IconCalendar } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import {
  BackgroundImage,
  Center,
  Group,
  Paper,
  PasswordInput,
  rem,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { type UseFormReturnType } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import Form, { type FormError } from '@/components/Form/Form';
import TextGradient from '@/components/TextGradient/TextGradient';
import { ROUTES } from '@/constants';
import useRegister from '@/hooks/graphql/useRegister';
import { ErrorsCodes } from '@/types';
import createValidationSchema from '@/validations';

const initialValues = {
  fullName: '',
  phoneNumber: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  // Mantine dates hold 'YYYY-MM-DD' strings; null until picked
  birthday: null as string | null,
};

// Latest birthday that is 18 today
const maxBirthday = dayjs().subtract(18, 'year').format('YYYY-MM-DD');

const phoneRegex = /^(?:\+84|0084|0)[35789]\d{8}$/;

const validationSchema = createValidationSchema<typeof initialValues>({
  fullName: z.string().trim().min(1, 'This field is required'),
  username: z.string().trim().min(1, 'This field is required'),
  phoneNumber: z.string().trim().regex(phoneRegex, 'Invalid phone number'),
  email: z.string().trim().email('Invalid email'),
  password: z.string().trim().min(8, 'Password should have at least 8 character'),
  birthday: z.iso
    .date({ error: 'Please pick your birthday' })
    .refine((date) => date <= maxBirthday, 'You need to be 18 or older to register'),
  confirmPassword: z.string().trim().min(1, 'This field is required'),
})
  .required()
  .refine((data) => data.confirmPassword === data.password, {
    message: 'Password did not match',
    path: ['confirmPassword'],
  });

const icon = <IconCalendar style={{ width: rem(18), height: rem(18) }} stroke={1.5} />;

const formErrors: FormError<typeof initialValues> = {
  [ErrorsCodes.USER_EXISTED]: [
    { fieldName: 'username', message: 'A user with this username already exist' },
    { fieldName: 'phoneNumber', message: 'A user with this phoneNumber already exist' },
    { fieldName: 'email', message: 'A user with this email already exist' },
  ],
};

const RegisterFields = ({ form }: { form: UseFormReturnType<typeof initialValues> }) => {
  const [visible, { toggle }] = useDisclosure(false);

  return (
    <>
      <Title size="h2" ta="center">
        Welcome to <TextGradient>TravelBliss</TextGradient>
      </Title>

      <Group justify="space-between">
        <TextInput
          withAsterisk
          type="text"
          label="Full Name"
          placeholder="Enter your full name"
          key={form.key('fullName')}
          {...form.getInputProps('fullName')}
        />

        <TextInput
          withAsterisk
          type="text"
          label="Username"
          placeholder="Enter your username"
          key={form.key('username')}
          {...form.getInputProps('username')}
        />
      </Group>

      <Group justify="space-between">
        <TextInput
          key={form.key('phoneNumber')}
          {...form.getInputProps('phoneNumber')}
          withAsterisk
          type="tel"
          label="Phone Number"
          placeholder="Enter your phone number"
        />

        <TextInput
          key={form.key('email')}
          {...form.getInputProps('email')}
          withAsterisk
          type="email"
          label="Email"
          placeholder="Enter your email address"
        />
      </Group>
      <DatePickerInput
        withAsterisk
        leftSection={icon}
        leftSectionPointerEvents="none"
        label="Birthday"
        description="You need to be 18 or older"
        placeholder="Pick your birthday"
        valueFormat="DD MMMM YYYY"
        // Start at the year grid around the latest allowed year: fewer clicks than paging months
        defaultLevel="decade"
        defaultDate={maxBirthday}
        maxDate={maxBirthday}
        minDate="1900-01-01"
        key={form.key('birthday')}
        {...form.getInputProps('birthday')}
      />

      <PasswordInput
        withAsterisk
        key={form.key('password')}
        {...form.getInputProps('password')}
        label="Password"
        visible={visible}
        placeholder="Enter your password"
        onVisibilityChange={toggle}
      />

      <PasswordInput
        withAsterisk
        key={form.key('confirmPassword')}
        {...form.getInputProps('confirmPassword')}
        label="Confirm password"
        visible={visible}
        placeholder="Reenter your password"
        onVisibilityChange={toggle}
      />
    </>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const {
    register,
    result: { loading },
  } = useRegister({});

  const handleSubmit = async ({ confirmPassword, birthday, ...rest }: typeof initialValues) => {
    // The API's DateTimeISO needs a full timestamp; a date-only string parses as UTC midnight, so no day shift
    await register({
      variables: { input: { ...rest, birthday: new Date(birthday as string).toISOString() } },
    });
    navigate(ROUTES.SIGN_IN);
  };

  return (
    <>
      <BackgroundImage
        h="100%"
        src="https://images.unsplash.com/photo-1503539680555-732099a55a56?q=80&w=2070&auto=format&fit=crop"
      >
        <Center h="100%">
          <Paper shadow="xs" p="md" mr={16} my="auto">
            <Form
              onSubmit={handleSubmit}
              initialValues={initialValues}
              w={480}
              formErrors={formErrors}
              validate={zod4Resolver(validationSchema)}
              loading={loading}
            >
              {(form) => <RegisterFields form={form} />}
            </Form>
          </Paper>
        </Center>
      </BackgroundImage>
    </>
  );
};

export default RegisterPage;
