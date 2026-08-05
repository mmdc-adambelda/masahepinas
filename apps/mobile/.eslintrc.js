module.exports = {
  extends: ['expo', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['/dist/*'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    // Import resolution (including the "@/*" path alias and workspace
    // packages) is already verified by `tsc --noEmit` in the typecheck
    // task; eslint-plugin-import's resolver has repeated compatibility
    // issues with TS path aliases in this monorepo setup, so we rely on
    // TypeScript as the source of truth for "does this import resolve".
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
  },
};
