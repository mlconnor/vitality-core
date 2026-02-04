import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use src/__tests__ for test files
    include: ['src/__tests__/**/*.test.ts'],
    
    // Run tests in sequence (SQLite doesn't handle parallel well)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    
    // Global setup/teardown
    globalSetup: './src/__tests__/helpers/global-setup.ts',
    
    // Per-file setup
    setupFiles: ['./src/__tests__/helpers/setup.ts'],
    
    // Environment
    environment: 'node',
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/data_processing/**',
        'src/**/*.d.ts',
      ],
    },
  },
  
  // Resolve aliases to match tsconfig
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

