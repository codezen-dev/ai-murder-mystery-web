import { createRouter, createWebHistory } from 'vue-router';
import HostView from './views/HostView.vue';
import PlayerView from './views/PlayerView.vue';

const routes = [
  { path: '/', redirect: '/host' },
  { path: '/host', component: HostView },
  { path: '/player', component: PlayerView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
