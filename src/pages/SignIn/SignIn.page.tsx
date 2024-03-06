import {
  ActionIcon,
  Anchor,
  BackgroundImage,
  Button,
  Center,
  Checkbox,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useState } from 'react';
import Form from '@/components/Form/Form';
import TextGradient from '@/components/TextGradient/TextGradient';
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
      <Container h="calc(100dvh - 52px - 36px)" fluid px={0}>
        <BackgroundImage
          h="100%"
          src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-6.png"
        >
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
                    <TextInput
                      withAsterisk
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      rightSection={
                        <TogglePassword
                          setShowPassword={setShowPassword}
                          showPassword={showPassword}
                        />
                      }
                      placeholder="Enter your password"
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
                      <Anchor href="https://mantine.dev" target="_blank" inherit>
                        Sign up
                      </Anchor>
                    </Group>
                  </Stack>
                )}
              </Form>
            </Paper>
          </Center>
        </BackgroundImage>
      </Container>
    </>
  );
};

type TogglePasswordProps = {
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
};

const TogglePassword = ({ showPassword, setShowPassword }: TogglePasswordProps) => (
  <ActionIcon onClick={() => setShowPassword(!showPassword)} variant="subtle">
    {showPassword ? <IconEyeOff /> : <IconEye />}
  </ActionIcon>
);

export default SignInPage;
