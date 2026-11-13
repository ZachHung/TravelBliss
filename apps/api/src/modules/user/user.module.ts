import { ContainerModule } from 'inversify';

import TOKEN from '../../core/container/types.container';
import Service from '../../core/shared/service';

import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

export class UserModule extends ContainerModule {
  constructor() {
    super((bind) => {
      bind<Service<User>>(TOKEN.Services.User).to(UserService);
      bind<UserResolver>(UserResolver).toSelf();
      bind<UserRepository>(TOKEN.Repositories.User).to(UserRepository);
    });
  }
}
