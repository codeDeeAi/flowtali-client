import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'

import './assets/main.css'

import App from './App.vue'
import router from './router'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { registerPermissionDirectives } from '@/directives/permissions'
import { i18n } from '@/i18n'
import { useLocaleStore } from '@/stores/locale'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const head = createHead()

app.use(pinia)
app.use(i18n)

// Sync the persisted locale (or browser default) into vue-i18n before the app
// renders. The router guard overrides this from the URL on public routes.
const localeStore = useLocaleStore()
localeStore.setLocale(localeStore.current)

app.use(router)
app.use(head)

registerPermissionDirectives(app)

app.mount('#app')
