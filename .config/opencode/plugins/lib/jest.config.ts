import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.ts'],
  roots: ['./'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        strict: true,
        esModuleInterop: true,
        module: 'ESNext',
        moduleResolution: 'bundler'
      }
    }]
  },
  extensionsToTreatAsEsm: ['.ts']
}

export default config
