import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const compiler = process.env.GEA_COMPILER_DIR || path.resolve(here, '../../../compiler');

const { noPluginCapabilities } = await import(
  pathToFileURL(path.join(compiler, 'dist/plugins/model.js'))
);

const header = path.join(here, 'benchmark-native.h');

export default {
  name: 'css-benchmark-native',
  instantiate() {
    return {
      producers: () => [],
      lower: () => false,
      capabilities: {
        ...noPluginCapabilities,
        hostFunctions: new Map(
          [
            'begin',
            'end',
            'check',
            'touch',
            'scroll',
            'scroll_value',
            'width',
            'clear',
            'finish',
            'has_class',
            'has_text',
            'metric',
            'samples',
          ].map((name) => [`__css_bench_${name}`, `::__css_bench_${name}`]),
        ),
        generatedSupportIncludes: [header],
        hostPreambles: new Map(
          [
            'begin',
            'end',
            'check',
            'touch',
            'scroll',
            'scroll_value',
            'width',
            'clear',
            'finish',
            'has_class',
            'has_text',
            'metric',
            'samples',
          ].map((name) => [`::__css_bench_${name}`, [`#include ${JSON.stringify(header)}`]]),
        ),
      },
    };
  },
};
