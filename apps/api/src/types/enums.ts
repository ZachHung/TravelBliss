import { registerEnumType } from 'type-graphql';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
registerEnumType(Role, {
  name: 'Role',
  description: 'Role of user',
  valuesConfig: {
    USER: {
      description: 'Normal User',
    },
    ADMIN: {
      description: 'Admin user',
    },
  },
});
