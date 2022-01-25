/*****
 License
 --------------
 Copyright © 2020 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the
 Apache License, Version 2.0 (the 'License') and you may not use these files
 except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files
 are distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied. See the License for the specific language
 governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 - Vijay Kumar <vijaya.guthi@modusbox.com>
 --------------
 ******/

import Inert from '@hapi/inert'
import Vision from '@hapi/vision'
import { Server, ServerRoute } from '@hapi/hapi'

import ErrorHandling from '@mojaloop/central-services-error-handling'
import { Util } from '@mojaloop/central-services-shared'
import OpenAPI from './openAPI'
import ApiDoc from './apiDoc'
import { StatePlugin } from './state'

async function register (server: Server): Promise<Server> {
  const openapiBackend = await OpenAPI.initialize()
  const plugins = [
    StatePlugin,
    ApiDoc,
    Util.Hapi.OpenapiBackendValidator,
    openapiBackend,
    Inert,
    Vision,
    ErrorHandling,
    Util.Hapi.HapiEventPlugin
  ]

  await server.register(plugins)

  // use as a catch-all handler
  server.route({
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    path: '/{path*}',
    handler: (req, h): ServerRoute =>
      openapiBackend.options.openapi.handleRequest(
        {
          method: req.method,
          path: req.path,
          body: req.payload,
          query: req.query,
          headers: req.headers
        },
        req,
        h
      )
  })

  return server
}

export default {
  register
}
