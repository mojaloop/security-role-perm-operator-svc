import { RelationshipApi } from '@ory/keto-client'
import axios, { AxiosResponse, AxiosError } from 'axios'
import { logger } from './logger'

const log = logger.child({ component: 'KetoRelationshipApiClient' })

const HTTP_TIMEOUT_MS = 10_000 // make configurable

const axiosInstance = axios.create({
  timeout: HTTP_TIMEOUT_MS,
  transitional: {
    // throw ETIMEDOUT error instead of generic ECONNABORTED on request timeouts
    clarifyTimeoutError: false,
  },
})
// todo: add retry logic

axiosInstance.interceptors.response.use(
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
