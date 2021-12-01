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

jest.setTimeout(50000)

const kc = new k8s.KubeConfig()
kc.loadFromDefault()

// If we want to do something in K8S, we can use the following APIs
// const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sApiCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi)
// const k8sApiPods = kc.makeApiClient(k8s.CoreV1Api)

const _relationTuplesToPermissionCombos = (relationTuples: Array<any>) => {
  return relationTuples?.map(item => item.object + ':' + item.subject.replace(/permission:([^#.]*)(#.*)?/, '$1'))
}

describe('K8S operator', (): void => {
  let oryKetoReadApi : keto.ReadApi
  beforeAll(async () => {
    console.log('Connecting to Keto...', Config.ORY_KETO_READ_SERVICE_URL)
    oryKetoReadApi = new keto.ReadApi(
      undefined,
      Config.ORY_KETO_READ_SERVICE_URL
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
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, 3 * Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Keto relation tuples should be empty initially', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'excludes'
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
      'excludes'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(4)
    const permissionCombos = _relationTuplesToPermissionCombos(response.data?.relation_tuples || [])
    expect(permissionCombos).toContain('PERMISSIONX1:PERMISSIONY1')
    expect(permissionCombos).toContain('PERMISSIONX1:PERMISSIONY2')
    expect(permissionCombos).toContain('PERMISSIONY1:PERMISSIONX1')
    expect(permissionCombos).toContain('PERMISSIONY2:PERMISSIONX1')
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
      'excludes'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(6)
    const permissionCombos = _relationTuplesToPermissionCombos(response.data?.relation_tuples || [])
    expect(permissionCombos).toContain('PERMISSIONX1:PERMISSIONY1')
    expect(permissionCombos).toContain('PERMISSIONX1:PERMISSIONY2')
    expect(permissionCombos).toContain('PERMISSIONY1:PERMISSIONX1')
    expect(permissionCombos).toContain('PERMISSIONY2:PERMISSIONX1')
    expect(permissionCombos).toContain('PERMISSIONX3:PERMISSIONY3')
    expect(permissionCombos).toContain('PERMISSIONY3:PERMISSIONX3')
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
      'excludes'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(2)
    const permissionCombos = _relationTuplesToPermissionCombos(response.data?.relation_tuples || [])
    expect(permissionCombos).toContain('PERMISSIONX3:PERMISSIONY3')
    expect(permissionCombos).toContain('PERMISSIONY3:PERMISSIONX3')
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
      'excludes'
    )
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(0)
  })
})
