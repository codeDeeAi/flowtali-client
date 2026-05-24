import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'

import './assets/main.css'

import App from './App.vue'
import router from './router'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { registerPermissionDirectives } from '@/directives/permissions'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const head = createHead()

app.use(pinia)
app.use(router)
app.use(head)

registerPermissionDirectives(app)

app.mount('#app')
