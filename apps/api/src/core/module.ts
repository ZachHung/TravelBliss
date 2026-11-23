import { type Router } from 'express';
import { ContainerModule, type Bind, type Container, type ServiceIdentifier } from 'inversify';
import { type DataSource, type ObjectLiteral } from 'typeorm';
import TOKEN from '@/core/container/types.container';
import { Inject } from '@/types/inversify';

type Class = new (...args: any[]) => unknown;
type EntityClass = new () => ObjectLiteral;

/** What one API module brings. `loadModules` turns it into container bindings, schema resolvers and routes. */
export interface ApiModule {
  /** Each gets a TypeORM repository, injected with `@InjectRepository(Entity)`. */
  entities?: EntityClass[];
  /** Singletons, injected by class: `@Inject(UserService)`. */
  services?: Class[];
  /** type-graphql resolvers: bound like services and added to the schema. */
  resolvers?: Class[];
  /** Express routes outside GraphQL (e.g. a provider callback), built from the container. */
  routes?: (get: <T>(id: ServiceIdentifier<T>) => T) => Router;
  /** Escape hatch for bindings that are not classes, such as a constant list. */
  bind?: (bind: Bind) => void;
}

/** Declares a module; the app lists every module once, in src/modules/index.ts. */
export const defineModule = (module: ApiModule): ApiModule => module;

// Entity names are unique (TypeORM's table names come from them), so one token per name
const repositoryToken = (entity: EntityClass) => Symbol.for(`Repository<${entity.name}>`);

/** Injects the repository of an entity listed in a module's `entities`. */
export const InjectRepository = (entity: EntityClass) => Inject(repositoryToken(entity));

export const loadModules = (container: Container, modules: ApiModule[]): void => {
  container.load(
    new ContainerModule(({ bind }) => {
      for (const { entities = [], services = [], resolvers = [], bind: bindMore } of modules) {
        for (const entity of entities) {
          // Resolved on first use, after the data source is initialised
          bind(repositoryToken(entity)).toDynamicValue((context) =>
            context.get<DataSource>(TOKEN.DataSource.Postgres).getRepository(entity)
          );
        }
        for (const target of [...services, ...resolvers]) {
          bind(target).toSelf();
        }
        bindMore?.(bind);
      }
    })
  );
};

export const resolversOf = (modules: ApiModule[]) =>
  modules.flatMap(({ resolvers = [] }) => resolvers) as [Class, ...Class[]];
