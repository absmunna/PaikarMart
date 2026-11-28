import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'apps/**/dist/**/*', 'node_modules/**/*', '**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
