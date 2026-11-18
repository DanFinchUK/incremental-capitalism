import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/base.css'
import './styles/theme.css'
import './styles/mobile.css'
import './styles/rooms.css'
import './styles/register.css'
import App from './App.vue'
import { useGameStore } from './stores/game'
import { scenariosOpen } from './engine/hall'
import { takeEnterOnLoad } from './utils/reloadPage'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')
// Every visit opens on the main menu, except straight after choosing a
// family on it: then into the game, or for a new family to its scenario
// (once there are scenarios) or the register
const store = useGameStore(pinia)
if (!takeEnterOnLoad()) store.openMenu()
else if (!store.familyIsFresh) store.closeMenu()
else if (scenariosOpen(store.hall)) store.openMenu('scenario')
else store.openCensus()
