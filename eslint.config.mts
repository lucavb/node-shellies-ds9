// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    tseslint.configs.strict,
    {
        // Global ignores
        ignores: ['dist/**/*', 'node_modules/**/*'],
    },
    {
        // Configuration for TypeScript files
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
        },
        rules: {
            // Disable indentation rules to focus on other quality rules
            '@typescript-eslint/indent': 'off',
            indent: 'off',
            // Allow non-null assertions in reasonable cases
            '@typescript-eslint/no-non-null-assertion': 'warn',
            // Allow empty interfaces for extending base types
            '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
        },
    },
);
