import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetTypography,
  transformerDirectives,
} from 'unocss'
import extractorPug from '@unocss/extractor-pug'
import presetAnimations from 'unocss-preset-animations'
import { presetShadcn } from 'unocss-preset-shadcn'

const PROD =
  process.env.NODE_ENV === 'production' &&
  process.env.BUILD_ENV !== 'development'

export default defineConfig({
  presets: [
    presetUno(),
    presetAnimations(),
    presetShadcn(),
    presetAttributify({
      prefix: 'uno:',
    }),
    presetTypography(),
  ],
  transformers: [transformerDirectives({})],
  extractors: [extractorPug()],
  rules: [
    ['dev-only', PROD ? { display: 'none', visibility: 'hidden' } : {}],
    [
      'bg-dev',
      {
        'background-image':
          'repeating-linear-gradient(-45deg, #e1bb4233, #e1bb4233 1rem, #55366333 1rem, #55366333 2rem)',
      },
    ],
  ],
  content: {
    pipeline: {
      include: [
        // the default
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
        // include js/ts files
        'docs/**/*.{js,ts}',
      ],
    },
  },
})
