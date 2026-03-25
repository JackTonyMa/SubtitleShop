import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createI18nInstance } from './i18n'
import './style.css'

const app = createApp(App)
const i18n = createI18nInstance()
app.use(createPinia())
app.use(i18n)
app.mount('#app')
