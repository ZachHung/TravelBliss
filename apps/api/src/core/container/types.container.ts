const TOKEN = {
  DataSource: {
    Postgres: Symbol.for('PostgresDataSource'),
  },
  Repositories: {
    User: Symbol.for('UserRepository'),
    LinkedSignIn: Symbol.for('LinkedSignInRepository'),
  },

  Services: {
    User: Symbol.for('UserService'),
    Session: Symbol.for('SessionService'),
    LinkedSignIn: Symbol.for('LinkedSignInService'),
  },

  SignInProviders: Symbol.for('SignInProviders'),

  Store: {
    Redis: Symbol.for('RedisStore'),
  },
};

export default TOKEN;
