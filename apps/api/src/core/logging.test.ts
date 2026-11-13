import { ApolloServer } from '@apollo/server';
import { type Request, type Response } from 'express';
import logger from '@/config/logger';
import { assignCorrelationId, formatError, loggingPlugin } from './logging';
import { BaseException } from './shared/exception';

const typeDefs = 'type Query { ok: String, expected: String, unexpected: String }';
const resolvers = {
  Query: {
    ok: () => 'yes',
    expected: () => {
      throw new BaseException('Wrong password', 'WRONG_PASSWORD');
    },
    unexpected: () => {
      throw new Error('relation "user" does not exist');
    },
  },
};

const run = async (query: string, isProduction = false) => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [loggingPlugin],
    formatError: formatError(isProduction),
  });
  const contextValue = { res: { locals: { correlationId: 'c-1' } }, auth: { userId: 'u1' } };
  const response = await server.executeOperation(
    { query, operationName: 'Op' },
    { contextValue: contextValue as never }
  );
  return response.body.kind === 'single' ? response.body.singleResult : undefined;
};

describe('loggingPlugin', () => {
  let log: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    log = vi.spyOn(logger, 'log').mockReturnValue(logger);
  });
  afterEach(() => vi.restoreAllMocks());

  it('logs a successful operation at info, without variables', async () => {
    await run('query Op { ok }');

    expect(log).toHaveBeenCalledWith(
      'info',
      'Op',
      expect.objectContaining({ correlationId: 'c-1', userId: 'u1', outcome: 'ok' })
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('variables');
  });

  it('logs expected errors at warn with their code and no stack', async () => {
    const result = await run('query Op { expected }');

    const [level, , fields] = log.mock.calls[0];
    expect(level).toBe('warn');
    expect(fields).toMatchObject({ outcome: ['WRONG_PASSWORD'] });
    expect(fields).not.toHaveProperty('errors');
    expect(result?.errors?.[0]).toMatchObject({
      message: 'Wrong password',
      extensions: { code: 'WRONG_PASSWORD', correlationId: 'c-1' },
    });
  });

  it('logs unexpected errors at error with the original message and stack', async () => {
    await run('query Op { unexpected }');

    const [level, , fields] = log.mock.calls[0];
    expect(level).toBe('error');
    expect(fields).toMatchObject({
      outcome: ['INTERNAL_SERVER_ERROR'],
      errors: [{ message: 'relation "user" does not exist', stack: expect.any(String) }],
    });
  });

  it('hides unexpected errors from clients in production, but not expected ones', async () => {
    const unexpected = await run('query Op { unexpected }', true);
    const expected = await run('query Op { expected }', true);

    expect(unexpected?.errors?.[0]).toEqual({
      message: 'Internal server error',
      extensions: { code: 'INTERNAL_SERVER_ERROR', correlationId: 'c-1' },
    });
    expect(expected?.errors?.[0]?.message).toBe('Wrong password');
  });
});

describe('assignCorrelationId', () => {
  const call = (incoming?: string) => {
    const res = { locals: {} as Record<string, string>, setHeader: vi.fn() };
    const req = { get: () => incoming } as unknown as Request;
    const next = vi.fn();
    assignCorrelationId(req, res as unknown as Response, next);
    return { id: res.locals.correlationId, res, next };
  };

  it('reuses a safe incoming id and echoes it', () => {
    const { id, res, next } = call('abc-123');

    expect(id).toBe('abc-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'abc-123');
    expect(next).toHaveBeenCalled();
  });

  it('replaces ids that could forge log lines', () => {
    const { id } = call('x\n{"level":"info","message":"fake"}');

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
