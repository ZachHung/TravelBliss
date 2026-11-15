import { ContainerModule } from 'inversify';
import TOKEN from '@/core/container/types.container';
import { LinkedSignInRepository } from './linked-sign-in.repository';
import { LinkedSignInResolver } from './linked-sign-in.resolver';
import { LinkedSignInService } from './linked-sign-in.service';
import { configuredProviders } from './providers';
import { type SignInProvider } from './providers/sign-in-provider';

export class LinkedSignInModule extends ContainerModule {
  constructor() {
    super((bind) => {
      bind<SignInProvider[]>(TOKEN.SignInProviders).toConstantValue(configuredProviders());
      bind<LinkedSignInService>(TOKEN.Services.LinkedSignIn).to(LinkedSignInService);
      bind<LinkedSignInResolver>(LinkedSignInResolver).toSelf();
      bind<LinkedSignInRepository>(TOKEN.Repositories.LinkedSignIn).to(LinkedSignInRepository);
    });
  }
}
