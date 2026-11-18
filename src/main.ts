import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/base.css'
import './styles/theme.css'
import './styles/mobile.css'
import './styles/rooms.css'
import './styles/register.css'
import App from './App.vue'
import { useGameStore } from './stores/game'
import { takeEnterOnLoad } from './utils/reloadPage'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')
// Every visit opens on the main menu, except straight after choosing a
// family on it: then into the game, or for a new family (its scenario chosen
// before the reload) the register
const store = useGameStore(pinia)
if (!takeEnterOnLoad()) store.openMenu()
else if (store.hasFamily) store.closeMenu()
else store.openCensus()
