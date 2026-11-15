/** Injection tokens for what is not a class; classes are injected by themselves (`@Inject(UserService)`). */
const TOKEN = {
  DataSource: {
    Postgres: Symbol.for('PostgresDataSource'),
  },
  Store: {
    Redis: Symbol.for('RedisStore'),
  },
  SignInProviders: Symbol.for('SignInProviders'),
};

export default TOKEN;
