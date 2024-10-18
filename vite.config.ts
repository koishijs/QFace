import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import VueRouter from 'unplugin-vue-router/vite'
import UnoCSS from 'unocss/vite'
import { resolve } from 'node:path'

const PROD = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [
    Vue(),
    AutoImport({
      dts: 'docs/auto-imports.d.ts',
      vueTemplate: true,
      imports: ['vue', 'vue-router', '@vueuse/core', 'pinia'],
      dirs: [
        'docs/components/**',
        'docs/stores',
        'docs/utils',
        'docs/types',
        'docs/models/**',
      ],
    }),
    Components({
      dts: 'docs/components.d.ts',
      dirs: ['docs/components'],
      resolvers: [],
    }),
    VueRouter({
      dts: 'docs/router.d.ts',
      routesFolder: 'docs/pages',
      getRouteName(node) {
        const name = node.fullPath
          .replaceAll('/', '-')
          .replace(/^-/, '')
          .replace(/^\d+\-?/, '')
        return name || 'index'
      },
    }),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'docs'),
    },
  },
  esbuild: {
    drop: PROD ? ['console'] : [],
  },
  server: {
    host: '0.0.0.0',
    port: 1005,
  },
})
