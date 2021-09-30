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

 - Vijaya Kumar Guthi <vijaya.guthi@modusbox.com>

 --------------
 ******/

import * as k8s from "@kubernetes/client-node"
import Config from './config'
import * as keto from '@ory/keto-client'
import sampleResource1 from './data/sample-resource1.json'
import sampleResource2 from './data/sample-resource2.json'
import sampleResource3 from './data/sample-resource3.json'

jest.setTimeout(50000)

const kc = new k8s.KubeConfig()
kc.loadFromDefault()

// If we want to do something in K8S, we can use the following APIs
// const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sApiCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi)
const k8sApiPods = kc.makeApiClient(k8s.CoreV1Api)

describe('K8S operator', (): void => {
  let ketoServiceIP = ''
  let oryKetoReadApi : keto.ReadApi
  beforeAll(async () => {
    // Get the external IP of keto service
    const ketoServiceStatusResponse = await k8sApiPods.readNamespacedServiceStatus(
      Config.K8S_KETO_SERVICE_NAME,
      Config.K8S_OPERATOR_NAMESPACE
    )
    const ketoServiceStatus = ketoServiceStatusResponse.body.status
    if (ketoServiceStatus) {
      const ingressStatus = ketoServiceStatus.loadBalancer?.ingress
      if (ingressStatus) {
        const firstIngress = ingressStatus[0]
        ketoServiceIP = firstIngress.ip || ''
      }
    }
    expect(ketoServiceIP).not.toBe('')
    const ketoReadApiURL = 'http://' + ketoServiceIP + ':' + Config.KETO_READ_PORT
    oryKetoReadApi = new keto.ReadApi(
      undefined,
      ketoReadApiURL
    )
  })
  it('Clear all the K8S custom resources', async () => {
    try {
      await k8sApiCustomObjects.deleteNamespacedCustomObject(
        Config.WATCH_RESOURCE_GROUP,
        Config.WATCH_RESOURCE_VERSION,
        Config.WATCH_NAMESPACE,
        Config.WATCH_RESOURCE_PLURAL,
        sampleResource1.metadata.name
      )
    } catch (err) {}
    try {
      await k8sApiCustomObjects.deleteNamespacedCustomObject(
        Config.WATCH_RESOURCE_GROUP,
        Config.WATCH_RESOURCE_VERSION,
        Config.WATCH_NAMESPACE,
        Config.WATCH_RESOURCE_PLURAL,
        sampleResource2.metadata.name
      )
    } catch (err) {}
    try {
      await k8sApiCustomObjects.deleteNamespacedCustomObject(
        Config.WATCH_RESOURCE_GROUP,
        Config.WATCH_RESOURCE_VERSION,
        Config.WATCH_NAMESPACE,
        Config.WATCH_RESOURCE_PLURAL,
        sampleResource3.metadata.name
      )
    } catch (err) {}
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, 3 * Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Keto relation tuples should be empty initially', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'granted'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(0)
  })
  it('Add a K8S custom resource', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_RESOURCE_PLURAL,
      sampleResource1
    )
    expect(status.response.statusCode).toEqual(201)
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Check the keto relation tuples to be updated', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'granted'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(2)
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('deployService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('listService')
  })
  it('Add a second K8S custom resource', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_RESOURCE_PLURAL,
      sampleResource2
    )
    expect(status.response.statusCode).toEqual(201)
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Check the keto relation tuples to be updated', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'granted'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(5)
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('deployService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('listService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('removeService')
  })
  it('Add a third K8S custom resource with same role and different permissions', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_RESOURCE_PLURAL,
      sampleResource3
    )
    expect(status.response.statusCode).toEqual(201)
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Check the keto relation tuples to be updated', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'granted'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(6)
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('deployService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('listService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('removeService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('monitorService')
  })
  it('Delete the first K8S custom resource', async () => {
    const status = await k8sApiCustomObjects.deleteNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_RESOURCE_PLURAL,
      sampleResource1.metadata.name
    )
    expect(status.response.statusCode).toEqual(200)
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Check the keto relation tuples to be updated', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'granted'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(5)
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('deployService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('listService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('removeService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('monitorService')
  })
  it('Delete the second K8S custom resource', async () => {
    const status = await k8sApiCustomObjects.deleteNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_RESOURCE_PLURAL,
      sampleResource2.metadata.name
    )
    expect(status.response.statusCode).toEqual(200)
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Check the keto relation tuples to be updated', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'granted'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(2)
    expect(response.data?.relation_tuples?.map(item => item.object)).not.toContain('deployService')
    expect(response.data?.relation_tuples?.map(item => item.object)).not.toContain('removeService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('listService')
    expect(response.data?.relation_tuples?.map(item => item.object)).toContain('monitorService')
  })
  it('Delete the third K8S custom resource', async () => {
    const status = await k8sApiCustomObjects.deleteNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_RESOURCE_PLURAL,
      sampleResource3.metadata.name
    )
    expect(status.response.statusCode).toEqual(200)
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Check the keto relation tuples to be again empty', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'granted'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(0)
  })
})
