import type { Config } from 'prettier';

const config: Config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  printWidth: 120,
  proseWrap: 'preserve',
  plugins: ['prettier-plugin-tailwindcss'],
};

module.exports = config;
