import type { Config } from 'jest';
import { createDefaultEsmPreset } from 'ts-jest';

const presetConfig = createDefaultEsmPreset();

export default {
  ...presetConfig,
  resolver: 'ts-jest-resolver',
  setupFilesAfterEnv: ['<rootDir>/src/__test__/setup.ts'],
} satisfies Config;
