import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import 'primeicons/primeicons.css';
import App from './App.vue';

const app = createApp(App);

app.use(createPinia());
app.use(VueQueryPlugin);
app.use(PrimeVue, { theme: { preset: Aura } });
app.use(ConfirmationService);
app.use(ToastService);

app.mount('#app');
