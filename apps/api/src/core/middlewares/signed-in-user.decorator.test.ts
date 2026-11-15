import { getMetadataStorage } from 'type-graphql';
import { SignedInUser } from './signed-in-user.decorator';

class Probe {
  public read(@SignedInUser() _user: unknown) {}
}

// The function type-graphql calls for the parameter, with the request's context
const resolve = (auth: unknown) => {
  const param = getMetadataStorage().params.find((p) => p.target === Probe) as unknown as {
    resolver: (data: { context: unknown }) => unknown;
  };
  return () => param.resolver({ context: { auth } });
};

describe('SignedInUser', () => {
  it('is the signed-in user, and UNAUTHENTICATED for a guest', () => {
    expect(resolve({ user: { id: 'u1' } })()).toEqual({ id: 'u1' });
    expect(resolve(undefined)).toThrow(/Access denied|authenticat/i);
  });
});
