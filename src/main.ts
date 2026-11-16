import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/base.css'
import './styles/theme.css'
import './styles/mobile.css'
import './styles/rooms.css'
import App from './App.vue'
import { useGameStore } from './stores/game'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')
// Every visit opens on the main menu
useGameStore(pinia).openMenu()
