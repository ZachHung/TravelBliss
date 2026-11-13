import { z } from 'zod';

const createValidationSchema = <TValues>(obj: Record<keyof TValues, z.ZodTypeAny>) => z.object(obj);

export default createValidationSchema;
