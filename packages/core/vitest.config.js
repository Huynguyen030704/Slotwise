import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: [
        'src/schedule.js',
        'src/parseNotes.js',
        'src/position.js',
        'src/tree.js',
        'src/nodeRows.js',
        'src/day.js',
        'src/dates.js',
        'src/report.js',
        'src/sync.js',
        'src/remoteRows.js',
        'src/settings.js',
        'src/buckets.js',
        'src/fields.js',
      ],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
