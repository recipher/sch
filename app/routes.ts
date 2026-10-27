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
    addLocation: post('/clients/:clientId/locations'),
    removeLocation: post('/clients/:clientId/locations/:locationId/remove'),
  },
  legalEntities: {
    show: get('/legal-entities/:legalEntityId'),
    createPayroll: post('/legal-entities/:legalEntityId/payrolls'),
    assignDefaults: post('/legal-entities/:legalEntityId/defaults'),
  },
  providers: {
    index: get('/providers'),
    create: post('/providers'),
    show: get('/providers/:providerId'),
    rename: post('/providers/:providerId'),
    addLocation: post('/providers/:providerId/locations'),
    removeLocation: post('/providers/:providerId/locations/:locationId/remove'),
  },
  serviceCentres: {
    index: get('/service-centres'),
    create: post('/service-centres'),
    show: get('/service-centres/:serviceCentreId'),
    rename: post('/service-centres/:serviceCentreId'),
    addLocation: post('/service-centres/:serviceCentreId/locations'),
    removeLocation: post('/service-centres/:serviceCentreId/locations/:locationId/remove'),
  },
  holidayCalendars: {
    show: get('/holiday-calendars/:country'),
    addPublicHoliday: post('/holiday-calendars/:country/public-holidays'),
    removePublicHoliday: post('/holiday-calendars/:country/public-holidays/remove'),
    resync: post('/holiday-calendars/:country/resync'),
  },
  payrolls: {
    show: get('/payrolls/:payrollId'),
    generate: post('/payrolls/:payrollId/generate'),
    assignParties: post('/payrolls/:payrollId/parties'),
  },
})
