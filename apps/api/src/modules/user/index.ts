import { defineModule } from '@/core/module';
import { User } from './user.entity';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

export const userModule = defineModule({
  entities: [User],
  services: [UserService],
  resolvers: [UserResolver],
});
