/* eslint-disable @typescript-eslint/no-var-requires */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'es2019',
        jsx: 'react',
        esModuleInterop: true,
        noImplicitAny: true,
      },
    }],
  },
};
