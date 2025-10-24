/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/
/* istanbul ignore file */

import { RelationshipApi } from '@ory/keto-client'
import axios, { AxiosResponse, AxiosError } from 'axios'
import { logger } from './logger'

const log = logger.child({ component: 'KetoRelationshipApiClient' })

const HTTP_TIMEOUT_MS = 10_000 // make configurable

// axios.defaults.timeout = HTTP_TIMEOUT_MS

const axiosInstance = axios.create({
  timeout: HTTP_TIMEOUT_MS,
  transitional: {
    // throw ETIMEDOUT error instead of generic ECONNABORTED on request timeouts
    clarifyTimeoutError: false,
  },
})
// todo: add retry logic

axios.interceptors.response.use(
  (response: AxiosResponse) => {
    log.debug('HTTP request succeeded: ', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
    })
    return response
  },
  (error: AxiosError) => {
    log.warn('HTTP request failed: ', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      code: error.code,
      message: error.message,
      status: error.response?.status,
    })
    return Promise.reject(error)
  }
)

export const createKetoRelationshipApiClient = (baseUrl: string) =>
  new RelationshipApi(undefined, baseUrl, axiosInstance)
