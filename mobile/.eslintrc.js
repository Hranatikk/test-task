module.exports = {
  root: true,
  extends: '@react-native',
  plugins: ['import'],
  settings: {
    'import/resolver': {
      typescript: { project: './tsconfig.json' },
    },
  },
  rules: {
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          { target: './core', from: ['./app', './stores'] },
          { target: './stores', from: './app' },
          {
            target: './core/common',
            from: ['./core/shared', './core/design-system', './core/modules', './core/overlays'],
          },
          {
            target: './core/shared',
            from: ['./core/design-system', './core/modules', './core/overlays'],
          },
          { target: './core/design-system', from: ['./core/modules', './core/overlays'] },
          { target: './core/modules', from: './core/overlays' },
        ],
      },
    ],
  },
};
