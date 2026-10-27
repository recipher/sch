import * as f from 'remix/data-schema/form-data'

import { country, region, requiredName } from '../form-schema.ts'

export const legalEntityForm = f.object({
  name: f.field(requiredName),
  country: f.field(country),
  region: f.field(region),
})
