import { createApp } from 'vue'
import App from './App.vue'
import router from './src/router'

import '@/assets/styles/index.css'

const app = createApp(App)

app.use(router).mount('#app')
