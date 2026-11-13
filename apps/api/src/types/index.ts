import { Request, Response } from 'express';

import type { AuthContext } from '../modules/session/session.type';

export interface Context {
  req: Request;
  res: Response;
  auth?: AuthContext;
}

export type Constructor<T> = new () => T;
