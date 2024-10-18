import App from './App.vue'
import 'uno.css'
import './styles/index.sass'
import { router } from './router'

const app = createApp(App)
app.use(router)

const pinia = createPinia()
app.use(pinia)

app.mount('#app')
