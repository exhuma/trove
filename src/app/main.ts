import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import '@core/style.css'
// Guided-tour spotlight styles — the tour library's own stylesheet (not an app
// style block); the runner lives in ./onboarding/runTour.ts.
import 'driver.js/dist/driver.css'

createApp(App).use(router).mount('#app')
