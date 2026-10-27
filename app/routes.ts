import { form, get, post, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  styles: get('/styles.css'),
  home: '/',
  signup: form('/signup'),
  login: form('/login'),
  logout: post('/logout'),
  account: get('/account'),
})
