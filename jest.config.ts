import type { Config } from 'jest';

const config: Config = {
  // 使用 ts-jest 进行 TypeScript 转换
  preset: 'ts-jest',

  // 测试环境为 Node.js（Electron 主进程逻辑）
  testEnvironment: 'node',

  // 测试文件匹配模式：单元测试 + 属性测试
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/property/**/*.prop.ts',
  ],

  // 模块路径别名映射（与 tsconfig.json 保持一致）
  moduleNameMapper: {
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
    '^@preload/(.*)$': '<rootDir>/src/preload/$1',
  },

  // 根目录
  roots: ['<rootDir>/tests', '<rootDir>/src'],

  // 覆盖率收集配置
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

export default config;
