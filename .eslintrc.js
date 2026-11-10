const ecmaVersion = 2018;
const tsParserOpts = {
  ecmaVersion: ecmaVersion,
  tsconfigRootDir: __dirname,
  project: './tsconfig.json',
};
const tsParser = '@typescript-eslint/parser';

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true,
  },
  extends: [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  parserOptions: tsParserOpts,
  plugins: [],
  // For all files (except when overriden)
  rules: {
    camelcase: 'off',
    'brace-style': ['error', '1tbs'],
    quotes: ['error', 'single', { avoidEscape: true }],
    'quote-props': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'no-tabs': 'off',
    'no-duplicate-imports': 'error',
    'no-trailing-whitespace': 'off',
    'no-param-reassign': 'off',
    'max-classes-per-file': ['error', 15],
    'space-infix-ops': ['error'],
    eqeqeq: ['error', 'smart'],

    'max-lines': ['error', 300],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    'max-statements': ['off', 10],
    'max-depth': ['error', 4],
    'max-nested-callbacks': ['error', 5],
    complexity: ['error', { max: 10 }], // number of paths
    'max-params': ['error', 5],
    'import/extensions': 'off',
    'import/first': 'error',
    'import/order': [
      'error',
      {
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [
          { pattern: 'react*', group: 'builtin', position: 'before' },
          { pattern: '@*', group: 'external' },
          { pattern: 'types/**', group: 'type' },
        ],
        pathGroupsExcludedImportTypes: ['^react'],
      },
    ],
    'import/no-unresolved': 'off',
    'import/cycle': 'off',
    'import/no-self-import': 'error',
    'import/prefer-default-export': 'off',
    'arrow-spacing': ['error', { before: true, after: true }],
    'arrow-parens': ['error', 'always'],
    'no-shadow': 'error',
    'no-console': 'warn',
    'no-namespace': 'off',
    'no-empty-function': 'off',
    'guard-for-in': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
  // For *.ts files
  overrides: [
    {
      files: ['**/*.{ts,tsx}'],
      parser: tsParser,
      parserOptions: tsParserOpts,
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-restricted-types': ['error', { types: banTypes() }],
        indent: 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-invalid-this': 'off',
        '@typescript-eslint/no-invalid-this': ['error'],
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/naming-convention': [
          'error',
          // Enforce that all variables, functions and properties are camelCase
          {
            selector: 'variableLike',
            format: ['camelCase', 'PascalCase'],
          },
          {
            selector: 'variable',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          },
          {
            selector: 'parameter',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
          },
          {
            selector: 'parameter',
            format: ['camelCase'],
            modifiers: ['unused'],
            leadingUnderscore: 'allowSingleOrDouble',
          },
          {
            selector: 'typeLike',
            format: ['PascalCase'],
          },
          // Enforce that boolean variables are prefixed with an allowed verb
          {
            selector: 'variable',
            types: ['boolean'],
            format: ['PascalCase'],
            prefix: ['is', 'should', 'has', 'can', 'did', 'will'],
          },
          // Enforce that interface names begin with an I
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
              regex: '^I[A-Z]',
              match: false,
            },
          },
        ],

        '@typescript-eslint/explicit-member-accessibility': [
          'error',
          {
            accessibility: 'explicit',
            overrides: {
              constructors: 'no-public',
            },
          },
        ],
      },
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: 'tsconfig.json',
          },
          node: true,
        },
      },
    },
    {
      files: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/mock*.{ts,tsx}',
        '**/cypress/**/*.*',
        'setupTests.ts',
      ],
      parser: tsParser,
      parserOptions: tsParserOpts,
      rules: {
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        'max-depth': 'off',
        'max-nested-callbacks': 'off',
        'no-console': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
        'no-use-before-define': 'off',
        '@typescript-eslint/naming-convention': 'off',
      },
    },
    {
      files: ['**/scripts/**/*.{js,ts}', '**/*.config.{js|ts}', '*Config.ts', '**/*.d.ts'],
      rules: {
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        'no-console': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-restricted-types': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'jest.config.ts',
    'src/migration',
    'old',
    '**/config/**/*.js',
    '**.node_modules/**/*.{ts,js,tsx,jsx}',
    '**/coverage/lcov-report/*.js',
    '**/.eslintrc.js',
  ],
};

// Copied from default rule https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/ban-types.md
// But removed "object" restriction.
function banTypes() {
  return {
    String: {
      message: 'Use string instead',
      fixWith: 'string',
    },
    Boolean: {
      message: 'Use boolean instead',
      fixWith: 'boolean',
    },
    Number: {
      message: 'Use number instead',
      fixWith: 'number',
    },
    Symbol: {
      message: 'Use symbol instead',
      fixWith: 'symbol',
    },
    Function: {
      message: [
        'The `Function` type accepts any function-like value.',
        'It provides no type safety when calling the function, which can be a common source of bugs.',
        'It also accepts things like class declarations, which will throw at runtime as they will not be called with `new`.',
        'If you are expecting the function to accept certain arguments, you should explicitly define the function shape.',
      ].join('\n'),
    },
    // object typing
    Object: {
      message: [
        'The `Object` type actually means "any non-nullish value", so it is marginally better than `unknown`.',
        '- If you want a type meaning "any object", you probably want `Record<string, unknown>` instead.',
        '- If you want a type meaning "any value", you probably want `unknown` instead.',
      ].join('\n'),
    },

    '{}': {
      message: [
        '`{}` actually means "any non-nullish value".',
        '- If you want a type meaning "any object", you probably want `Record<string, unknown>` instead.',
        '- If you want a type meaning "any value", you probably want `unknown` instead.',
      ].join('\n'),
    },
  };
}
