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
import { zodResolver } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import createValidationSchema from '@/validations';
import { ErrorsCodes } from '@/types';
import useRegister from '@/hooks/graphql/useRegister';
import { ROUTES } from '@/constants';
import TextGradient from '@/components/TextGradient/TextGradient';
import Form, { FormError } from '@/components/Form/Form';

const initialValues = {
  fullName: '',
  phoneNumber: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  birthday: new Date(),
};

const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

const validationSchema = createValidationSchema<typeof initialValues>({
  fullName: z.string().trim().min(1, 'This field is required'),
  username: z.string().trim().min(1, 'This field is required'),
  phoneNumber: z.string().trim().regex(phoneRegex, 'Invalid phone number'),
  email: z.string().trim().email('Invalid email'),
  password: z.string().trim().min(8, 'Password should have at least 8 character'),
  birthday: z
    .date()
    .max(dayjs().subtract(18, 'year').toDate(), 'User need to be 18 or older to register'),
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

const RegisterPage = () => {
  const navigate = useNavigate();
  const [visible, { toggle }] = useDisclosure(false);
  const {
    register,
    result: { loading },
  } = useRegister({});

  const handleSubmit = async ({ confirmPassword, ...rest }: typeof initialValues) => {
    await register({ variables: { input: rest } });
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
              validate={zodResolver(validationSchema)}
              loading={loading}
            >
              {(form) => (
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
                      {...form.getInputProps('fullName')}
                      key={form.key('fullName')}
                    />

                    <TextInput
                      withAsterisk
                      type="text"
                      label="Username"
                      placeholder="Enter your username"
                      {...form.getInputProps('username')}
                      key={form.key('username')}
                    />
                  </Group>

                  <Group justify="space-between">
                    <TextInput
                      {...form.getInputProps('phoneNumber')}
                      key={form.key('phoneNumber')}
                      withAsterisk
                      type="tel"
                      label="Phone Number"
                      placeholder="Enter your phone number"
                    />

                    <TextInput
                      {...form.getInputProps('email')}
                      key={form.key('email')}
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
                    placeholder="Pick your birthday"
                    {...form.getInputProps('birthday')}
                    key={form.key('birthday')}
                  />

                  <PasswordInput
                    withAsterisk
                    {...form.getInputProps('password')}
                    key={form.key('password')}
                    label="Password"
                    visible={visible}
                    placeholder="Enter your password"
                    onVisibilityChange={toggle}
                  />

                  <PasswordInput
                    withAsterisk
                    {...form.getInputProps('confirmPassword')}
                    key={form.key('confirmPassword')}
                    label="Confirm password"
                    visible={visible}
                    placeholder="Reenter your password"
                    onVisibilityChange={toggle}
                  />
                </>
              )}
            </Form>
          </Paper>
        </Center>
      </BackgroundImage>
    </>
  );
};

export default RegisterPage;
