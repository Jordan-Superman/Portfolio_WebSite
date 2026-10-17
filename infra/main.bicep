// Azure Static Web App (Free tier) for the portfolio site.
// Deploys are pushed from GitHub Actions using the deployment token, so the
// resource isn't linked to the repo here.

@description('Name of the Static Web App.')
param name string = 'swa-portfolio-jordan'

@description('Static Web Apps is only available in certain regions.')
@allowed([
  'eastasia'
  'eastus2'
  'centralus'
  'westus2'
  'westeurope'
])
param location string = 'eastasia'

resource site 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output defaultHostname string = site.properties.defaultHostname
