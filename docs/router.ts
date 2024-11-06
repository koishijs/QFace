import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

export const router = createRouter({
  history: createWebHashHistory(),
  // pass the generated routes written by the plugin 🤖
  routes,
})
