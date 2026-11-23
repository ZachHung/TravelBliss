import { Container } from 'inversify';
import TOKEN from '@/core/container/types.container';
import { modules } from '@/modules';
import { LinkedSignIn } from '@/modules/linked-sign-in/linked-sign-in.entity';
import { LinkedSignInService } from '@/modules/linked-sign-in/linked-sign-in.service';
import { loadModules, resolversOf } from './module';

// The real module list in a container with fake Postgres and Redis: every injection must resolve
const build = () => {
  const container = new Container({ defaultScope: 'Singleton' });
  container
    .bind(TOKEN.DataSource.Postgres)
    .toConstantValue({ getRepository: (entity: unknown) => ({ entity }) });
  container.bind(TOKEN.Store.Redis).toConstantValue({});
  loadModules(container, modules);
  return container;
};

describe('loadModules', () => {
  it('resolves every resolver of every module, with its services and repositories', () => {
    const container = build();

    for (const resolver of resolversOf(modules)) {
      expect(container.get(resolver)).toBeInstanceOf(resolver);
    }
    const service = container.get(LinkedSignInService) as unknown as { links: { entity: unknown } };
    expect(service.links.entity).toBe(LinkedSignIn);
  });

  it('binds what a module adds through `bind`, and builds every module router from the container', () => {
    const container = build();

    expect(container.get(TOKEN.SignInProviders)).toBeInstanceOf(Array);
    const withRoutes = modules.filter((module) => module.routes);
    expect(withRoutes).not.toHaveLength(0);
    for (const { routes } of withRoutes) {
      expect(routes!((id) => container.get(id))).toBeTypeOf('function');
    }
  });

  it('makes each service a singleton', () => {
    const container = build();

    expect(container.get(LinkedSignInService)).toBe(container.get(LinkedSignInService));
  });
});
