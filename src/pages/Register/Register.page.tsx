import {
  BackgroundImage,
  Center,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Form from '@/components/Form/Form';
import TextGradient from '@/components/TextGradient/TextGradient';

const RegisterPage = () => {
  const [visible, { toggle }] = useDisclosure(false);
  return (
    <>
      <BackgroundImage
        h="100%"
        src="https://images.unsplash.com/photo-1503539680555-732099a55a56?q=80&w=2070&auto=format&fit=crop"
      >
        <Center h="100%">
          <Paper shadow="xs" p="md" mr={16} my="auto">
            <Form onSubmit={() => {}} initialValues={{}}>
              {(form) => (
                <Stack w={360}>
                  <Title size="h2" ta="center">
                    Welcome to <TextGradient>TravelBliss</TextGradient>
                  </Title>
                  <TextInput
                    {...form.getInputProps('fullName')}
                    withAsterisk
                    type="text"
                    label="Full Name"
                    placeholder="Truong Thanh Hung"
                  />

                  <TextInput
                    {...form.getInputProps('phoneNumber')}
                    withAsterisk
                    type="tel"
                    label="Phone Number"
                    placeholder="Enter your phone number"
                  />

                  <TextInput
                    {...form.getInputProps('email')}
                    withAsterisk
                    type="email"
                    label="Email"
                    placeholder="zachhung911@gmail.com"
                  />

                  <PasswordInput
                    withAsterisk
                    {...form.getInputProps('password')}
                    label="Password"
                    visible={visible}
                    placeholder="Enter your password"
                    onVisibilityChange={toggle}
                  />

                  <PasswordInput
                    withAsterisk
                    {...form.getInputProps('confirmPassword')}
                    label="Confirm password"
                    visible={visible}
                    placeholder="Reenter your password"
                    onVisibilityChange={toggle}
                  />
                </Stack>
              )}
            </Form>
          </Paper>
        </Center>
      </BackgroundImage>
    </>
  );
};

export default RegisterPage;
