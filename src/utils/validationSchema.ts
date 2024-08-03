import { z } from 'zod';

const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

export const RegisterSchema = z.object({
  fullName: z.string(),
  phoneNumber: z.string().regex(phoneRegex, 'Invalid Number!'),
  email: z.string().email({ message: 'Invalid email' }),
  password: z.string().min(8, 'Password should have at least 8 character'),
  age: z.number().min(18, {
    message: 'You must be at least 18 to create an account',
  }),
});
