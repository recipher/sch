import { form, get, post, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  styles: get('/styles.css'),
  home: '/',
  signup: form('/signup'),
  login: form('/login'),
  logout: post('/logout'),
  account: get('/account'),
  clients: {
    index: get('/clients'),
    create: post('/clients'),
    show: get('/clients/:clientId'),
    createLegalEntity: post('/clients/:clientId/legal-entities'),
  },
  legalEntities: {
    show: get('/legal-entities/:legalEntityId'),
    createPayroll: post('/legal-entities/:legalEntityId/payrolls'),
  },
  payrolls: {
    show: get('/payrolls/:payrollId'),
    generate: post('/payrolls/:payrollId/generate'),
  },
})
