import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import {
  Anchor,
  BackgroundImage,
  Center,
  Checkbox,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { zodResolver } from '@mantine/form';
import Form, { FormError } from '@/components/Form/Form';
import TextGradient from '@/components/TextGradient/TextGradient';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';
import { ErrorsCodes } from '@/types';

import './SignIn.css';

import createValidationSchema from '@/validations';

const initialValues = {
  phoneNumber: '',
  password: '',
  alwaySignIn: false,
};

const formErrors: FormError<typeof initialValues> = {
  [ErrorsCodes.USER_NOT_FOUND]: [{ fieldName: 'phoneNumber', message: 'This user does not exist' }],
  [ErrorsCodes.WRONG_PASSWORD]: [{ fieldName: 'password', message: 'Wrong password' }],
};

const validationSchema = createValidationSchema({
  phoneNumber: z.string().trim().min(1, 'This field is required'),
  password: z.string().trim().min(1, 'This field is required'),
});

const SignInPage = () => {
  const [showPassword, setShowPassword] = useState(false);

  const {
    onLogin: [login, { loading }],
  } = useAuth();

  const handleSubmit = async (values: typeof initialValues) => {
    await login(values.phoneNumber, values.password, values.alwaySignIn);
  };

  return (
    <>
      <BackgroundImage h="100%" src="images/bg-6.png">
        <Center h="100%">
          <Paper shadow="xs" p="md" mr={16} my="auto">
            <Form
              onSubmit={handleSubmit}
              formErrors={formErrors}
              initialValues={initialValues}
              loading={loading}
              footer={formFooter}
              submitLabel="Sign In"
              validate={zodResolver(validationSchema)}
              submitFullWidth
            >
              {(form) => (
                <>
                  <Title size="h2" ta="center">
                    <TextGradient>Sign In</TextGradient>
                  </Title>

                  <TextInput
                    withAsterisk
                    type="tel"
                    label="Phone Number"
                    placeholder="Enter your phone number"
                    {...form.getInputProps('phoneNumber')}
                  />

                  <PasswordInput
                    withAsterisk
                    label="Password"
                    visible={showPassword}
                    placeholder="Enter your password"
                    onVisibilityChange={setShowPassword}
                    {...form.getInputProps('password')}
                  />

                  <Checkbox
                    className="checkbox"
                    radius="sm"
                    label={
                      <Group justify="space-between" w="100%">
                        <Text inherit>Remember Me</Text>
                        <Anchor href="https://mantine.dev" target="_blank" inherit>
                          Forgot your password?
                        </Anchor>
                      </Group>
                    }
                    {...form.getInputProps('alwaySignIn', { type: 'checkbox' })}
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

const formFooter = (
  <Group fz="sm" justify="center" gap="xs">
    Not a member?{' '}
    <Anchor to={ROUTES.REGISTER} inherit component={Link}>
      Sign up
    </Anchor>
  </Group>
);

export default SignInPage;
