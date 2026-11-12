import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/base.css'
import './styles/theme.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
