import { z } from 'zod';
import createValidationSchema from './index';

describe('createValidationSchema', () => {
  const schema = createValidationSchema<{ name: string; age: number }>({
    name: z.string().min(1, 'required'),
    age: z.number().min(18, 'too young'),
  });

  it('accepts valid values', () => {
    expect(schema.safeParse({ name: 'An', age: 20 }).success).toBe(true);
  });

  it('reports the message of each failing field', () => {
    const result = schema.safeParse({ name: '', age: 10 });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['required', 'too young']);
  });
});
