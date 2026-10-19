module.exports = {
  projects: [
    {
      displayName: 'core',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/core/common/**/*.test.ts',
        '<rootDir>/core/shared/validation/**/*.test.ts',
        '<rootDir>/core/modules/*/model/**/*.test.ts',
        '<rootDir>/core/modules/*/service/**/*.test.ts',
        '<rootDir>/core/modules/*/__tests__/**/*.test.ts',
        '<rootDir>/__tests__/integration/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@core/(.*)$': '<rootDir>/core/$1',
        '^@app/(.*)$': '<rootDir>/app/$1',
        '^@stores/(.*)$': '<rootDir>/stores/$1',
      },
      globalSetup: '<rootDir>/__tests__/setup/globalSetup.mjs',
      globalTeardown: '<rootDir>/__tests__/setup/globalTeardown.mjs',
    },
    {
      displayName: 'ui',
      preset: '@react-native/jest-preset',
      testMatch: [
        '<rootDir>/app/components/**/*.test.tsx',
        '<rootDir>/core/design-system/kit/**/*.test.tsx',
      ],
      moduleNameMapper: {
        '^@core/(.*)$': '<rootDir>/core/$1',
        '^@app/(.*)$': '<rootDir>/app/$1',
        '^@assets/(.*)$': '<rootDir>/assets/$1',
      },
    },
  ],
};
