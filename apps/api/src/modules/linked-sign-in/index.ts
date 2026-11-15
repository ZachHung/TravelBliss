import TOKEN from '@/core/container/types.container';
import { defineModule } from '@/core/module';
import { LinkedSignIn } from './linked-sign-in.entity';
import { LinkedSignInResolver } from './linked-sign-in.resolver';
import { linkedSignInRoutes } from './linked-sign-in.routes';
import { LinkedSignInService } from './linked-sign-in.service';
import { configuredProviders } from './providers';

export const linkedSignInModule = defineModule({
  entities: [LinkedSignIn],
  services: [LinkedSignInService],
  resolvers: [LinkedSignInResolver],
  routes: (get) => linkedSignInRoutes(get(LinkedSignInService)),
  bind: (bind) => bind(TOKEN.SignInProviders).toConstantValue(configuredProviders()),
});
