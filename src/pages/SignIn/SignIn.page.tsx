import {
  Anchor,
  BackgroundImage,
  Button,
  Center,
  Checkbox,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Form from '@/components/Form/Form';
import TextGradient from '@/components/TextGradient/TextGradient';
import { ROUTES } from '@/constants';
import useAuth from '@/hooks/useAuth';
import './SignIn.css';

const SignInPage = () => {
  const [showPassword, setShowPassword] = useState(false);

  const {
    onLogin: [login],
  } = useAuth();

  const initialValues = {
    phoneNumber: '',
    password: '',
    alwaySignIn: false,
  };

  const handleSubmit = async (values: typeof initialValues) => {
    login(values.phoneNumber, values.password);
  };

  return (
    <>
      <BackgroundImage h="100%" src="images/bg-6.png">
        <Center h="100%">
          <Paper shadow="xs" p="md" mr={16} my="auto">
            <Form onSubmit={handleSubmit} initialValues={initialValues}>
              {(form) => (
                <Stack w={360}>
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

                  <Button type="submit" fw="normal" mt="md">
                    Sign In
                  </Button>

                  <Group fz="sm" justify="center" gap="xs">
                    Not a member?{' '}
                    <Anchor to={ROUTES.REGISTER} inherit component={Link}>
                      Sign up
                    </Anchor>
                  </Group>
                </Stack>
              )}
            </Form>
          </Paper>
        </Center>
      </BackgroundImage>
    </>
  );
};

export default SignInPage;
