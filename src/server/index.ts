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

 - Vijay Kumar Guthi <vijaya.guthi@modusbox.com>

 --------------
 ******/
// workaround for lack of typescript types for mojaloop dependencies
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../ambient.d.ts"/>
import { Server } from '@hapi/hapi'
import { name, version } from '../../package.json'
import { ServiceConfig } from '../shared/config'
import extensions from './extensions'
import plugins from './plugins'

import onValidateFail from './handlers/onValidateFail'
import Logger from '@mojaloop/central-services-logger'
import { validateRoutes } from '@mojaloop/central-services-error-handling'

async function _create (config: ServiceConfig): Promise<Server> {
  const server: Server = new Server({
    host: config.HOST,
    port: config.PORT,
    routes: {
      validate: {
        options: validateRoutes(),
        failAction: onValidateFail
      },
      cors: {
        origin: config.CORS_WHITELIST,
        credentials: config.ALLOW_CREDENTIALS
      }
    }
  })

  return server
}

async function _start (server: Server): Promise<Server> {
  Logger.info(`${name}@${version} is running: ${server.info.uri}`)
  await server.start()
  return server
}

async function run (config: ServiceConfig): Promise<Server> {
  const server = await _create(config)
  await plugins.register(server)
  await extensions.register(server)
  return _start(server)
}

export default {
  run
}
