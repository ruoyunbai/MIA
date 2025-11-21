module.exports = {
  root: true,
  env: {
    es2021: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  },
  overrides: [
    {
      files: ['frontend/**/*.{js,jsx,ts,tsx}'],
      env: {
        browser: true
      },
      plugins: ['react', 'react-hooks'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
      ],
      settings: {
        react: {
          version: 'detect'
        }
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off'
      }
    },
    {
      files: ['backend/**/*.{js,ts}'],
      env: {
        node: true
      },
      plugins: ['n'],
      extends: ['plugin:n/recommended'],
      rules: {
        'n/no-missing-import': 'off'
      }
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      parserOptions: {
        project: false
      },
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off'
      }
    }
  ],
  rules: {
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type'
        ],
        'newlines-between': 'never'
      }
    ],
    'import/no-unresolved': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off'
  }
};
