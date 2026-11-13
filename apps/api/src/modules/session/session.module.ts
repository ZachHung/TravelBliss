import { ContainerModule } from 'inversify';

import TOKEN from '../../core/container/types.container';

import { SessionService } from './session.service';

export class SessionModule extends ContainerModule {
  constructor() {
    super((bind) => {
      bind<SessionService>(TOKEN.Services.Session).to(SessionService);
    });
  }
}
