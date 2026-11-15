import { defineModule } from '@/core/module';
import { SessionService } from './session.service';

export const sessionModule = defineModule({ services: [SessionService] });
