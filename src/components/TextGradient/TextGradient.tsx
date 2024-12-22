import { PropsWithChildren } from 'react';
import { Text, TextProps } from '@mantine/core';

const TextGradient = ({ children, ...textProps }: PropsWithChildren<TextProps>) => (
  <Text
    inherit
    variant="gradient"
    component="span"
    gradient={{ from: 'teal', to: 'blue' }}
    {...textProps}
  >
    {children}
  </Text>
);

export default TextGradient;
