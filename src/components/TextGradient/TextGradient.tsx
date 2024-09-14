import { PropsWithChildren } from 'react';
import { Text, TextProps } from '@mantine/core';

type TextGradientProps = TextProps & PropsWithChildren;
const TextGradient = ({ children, ...textProps }: TextGradientProps) => (
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
