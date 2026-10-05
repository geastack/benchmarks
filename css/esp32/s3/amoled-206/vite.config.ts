export default {
  build: {
    lib: {
      entry: 'index.tsx',
      formats: ['iife'],
      name: 'amoled206Benchmark',
      fileName: () => 'index.js',
    },
    minify: false,
  },
};
