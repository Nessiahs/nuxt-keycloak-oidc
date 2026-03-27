import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import prettier from 'eslint-config-prettier'

export default createConfigForNuxt({
  features: {
    tooling: true,
    stylistic: true,
  },
  dirs: {
    src: ['./src', './playground'],
  },
})
  .append(prettier)
  .append({
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'sort-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
    },
  })
  .append({
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      // erlaubt gezieltes any für Mocks
      '@typescript-eslint/no-explicit-any': 'off',

      // Mocks / spies haben oft unused args
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Tests brauchen oft flexible types
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // console ist in tests ok
      'no-console': 'off',
    },
  })

