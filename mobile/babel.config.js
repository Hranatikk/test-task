module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@app': './app',
          '@core': './core',
          '@stores': './stores',
          '@assets': './assets',
        },
      },
    ],
  ],
};
