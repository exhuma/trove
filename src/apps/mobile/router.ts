import { createRouter, createWebHistory } from 'vue-router'
import { authReady, useAuth } from '@core/auth'
import CollectionView from './views/CollectionView.vue'
import NeedsView from './views/NeedsView.vue'
import LoginView from './views/LoginView.vue'
import AuthCallbackView from './views/AuthCallbackView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'collection', component: CollectionView, meta: { requiresAuth: true } },
    { path: '/needs', name: 'needs', component: NeedsView, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/auth/callback', name: 'auth-callback', component: AuthCallbackView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  await authReady
  const { signedIn } = useAuth()
  if (to.meta.requiresAuth && !signedIn.value) return { name: 'login' }
  if (to.name === 'login' && signedIn.value) return { name: 'collection' }
  return true
})
