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
import ServiceConfig from './../../../src/shared/config'
// eslint-disable-next-line max-len
import { PermissionExclusionsValidator, RolePermissions, PermissionExclusions } from './../../../src/validation/permission-exclusions'
import * as keto from '@ory/keto-client'
import role1Resource from './data/cr-role1.json'
import role2Resource from './data/cr-role2.json'
import pe1Resource from './data/cr-permission-exclusion1.json'
import pe2Resource from './data/cr-permission-exclusion2.json'

jest.setTimeout(50000)

ServiceConfig.ORY_KETO_READ_SERVICE_URL = Config.ORY_KETO_READ_SERVICE_URL
ServiceConfig.ORY_KETO_WRITE_SERVICE_URL = Config.ORY_KETO_WRITE_SERVICE_URL

const kc = new k8s.KubeConfig()
kc.loadFromDefault()

// If we want to do something in K8S, we can use the following APIs
// const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sApiCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi)
// const k8sApiPods = kc.makeApiClient(k8s.CoreV1Api)

const permissionExclusionsValidator = new PermissionExclusionsValidator(ServiceConfig)

const _relationTuplesToPermissionCombos = (relationTuples: Array<any>) => {
  return relationTuples?.map(item => item.object + ':' + item.subject.replace(/permission:([^#.]*)(#.*)?/, '$1'))
}

describe('Permission Exclusion Validator', (): void => {
  let oryKetoReadApi : keto.ReadApi
  let oryKetoWriteApi: keto.WriteApi
  beforeAll(async () => {
    console.log('Connecting to Keto...', Config.ORY_KETO_READ_SERVICE_URL)
    oryKetoReadApi = new keto.ReadApi(
      undefined,
      Config.ORY_KETO_READ_SERVICE_URL
    )
    oryKetoWriteApi = new keto.WriteApi(
      undefined,
      Config.ORY_KETO_WRITE_SERVICE_URL
    )
  })
  it('Clear all the K8S custom resources', async () => {
    // Remove keto user role assignments
    try {
      await oryKetoWriteApi.deleteRelationTuple(
        'role',
        'PEVALROLE1',
        'member',
        'user1'
      )
    } catch (err) {}
    try {
      await oryKetoWriteApi.deleteRelationTuple(
        'role',
        'PEVALROLE2',
        'member',
        'user1'
      )
    } catch (err) {}

    // Remove role permission mappings
    try {
      await k8sApiCustomObjects.deleteNamespacedCustomObject(
        Config.WATCH_RESOURCE_GROUP,
        Config.WATCH_RESOURCE_VERSION,
        Config.WATCH_NAMESPACE,
        Config.WATCH_ROLE_PERMISSIONS_RESOURCE_PLURAL,
        role1Resource.metadata.name
      )
    } catch (err) {}
    try {
      await k8sApiCustomObjects.deleteNamespacedCustomObject(
        Config.WATCH_RESOURCE_GROUP,
        Config.WATCH_RESOURCE_VERSION,
        Config.WATCH_NAMESPACE,
        Config.WATCH_ROLE_PERMISSIONS_RESOURCE_PLURAL,
        role2Resource.metadata.name
      )
    } catch (err) {}
    // Remove permission exclusions
    try {
      await k8sApiCustomObjects.deleteNamespacedCustomObject(
        Config.WATCH_RESOURCE_GROUP,
        Config.WATCH_RESOURCE_VERSION,
        Config.WATCH_NAMESPACE,
        Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
        pe1Resource.metadata.name
      )
    } catch (err) {}
    try {
      await k8sApiCustomObjects.deleteNamespacedCustomObject(
        Config.WATCH_RESOURCE_GROUP,
        Config.WATCH_RESOURCE_VERSION,
        Config.WATCH_NAMESPACE,
        Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
        pe2Resource.metadata.name
      )
    } catch (err) {}
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, 3 * Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Keto relation tuples for user role assignments should be empty initially', async () => {
    const response = await oryKetoReadApi.getRelationTuples(
      'role',
      undefined,
      'member'
    )
    console.log(response.data)
    expect(response).toHaveProperty('data')
    expect(response.data).toHaveProperty('relation_tuples')
    expect(Array.isArray(response.data.relation_tuples)).toBe(true)
    expect(response.data?.relation_tuples?.length).toEqual(0)
  })
  it('Keto relation tuples for role permissions should be empty initially', async () => {
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
  it('Keto relation tuples for permission exclusions should be empty initially', async () => {
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
  it('Add a role1 permission mapping', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_ROLE_PERMISSIONS_RESOURCE_PLURAL,
      role1Resource
    )
    expect(status.response.statusCode).toEqual(201)
  })
  it('Add a role2 permission mapping', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_ROLE_PERMISSIONS_RESOURCE_PLURAL,
      role2Resource
    )
    expect(status.response.statusCode).toEqual(201)
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Assign role1 to user1', async () => {
    const response = await oryKetoWriteApi.createRelationTuple({
      namespace: 'role',
      object: 'PEVALROLE1',
      relation: 'member',
      subject: 'user1'
    })
    expect(response).toHaveProperty('status')
    expect(response.status).toEqual(201)
  })
  // it('Assign role2 to user1', async () => {
  //   const response = await oryKetoWriteApi.createRelationTuple({
  //     namespace: 'role',
  //     object: 'PEVALROLE2',
  //     relation: 'member',
  //     subject: 'user1'
  //   })
  //   expect(response).toHaveProperty('status')
  //   expect(response.status).toEqual(201)
  // })
  // it('Un-assign role2 from user1', async () => {
  //   const response = await oryKetoWriteApi.deleteRelationTuple(
  //     'role',
  //     'PEVALROLE2',
  //     'member',
  //     'user1'
  //   )
  //   expect(response).toHaveProperty('status')
  //   expect(response.status).toEqual(204)
  // })
  it('Add a permission exclusion', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
      pe1Resource
    )
    expect(status.response.statusCode).toEqual(201)
  })
  it('Wait for some time', async () => {
    await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  })
  it('Try to execute rolepermissions validation function', async () => {
    const rolePermissions: RolePermissions[] = [
      {
        rolename: 'PEVALROLE1',
        permissions: [
          'PERMISSIONX1',
          'PERMISSIONX2'
        ]
      },
      {
        rolename: 'PEVALROLE2',
        permissions: [
          'PERMISSIONY1',
          'PERMISSIONY2'
        ]
      }
    ]
    const permissionExclusions: PermissionExclusions[] = [
      {
        permissionsA: [
          'PERMISSIONX1'
        ],
        permissionsB: [
          'PERMISSIONY1'
        ]
      }
    ]
    await permissionExclusionsValidator.validateRolePermissions(rolePermissions, permissionExclusions)
  })

  it('Try to assign role2 to user1', async () => {
    const userRole = {
      username: 'user1',
      roles: [
        'PEVALROLE2'
      ]
    }
    await expect(permissionExclusionsValidator.validateUserRole(userRole)).resolves.not.toThrowError()
  })
  it('Try to assign role1 and role2 to user1', async () => {
    const userRole = {
      username: 'user1',
      roles: [
        'PEVALROLE1',
        'PEVALROLE2'
      ]
    }
    await expect(permissionExclusionsValidator.validateUserRole(userRole)).rejects.toThrowError()
  })
  // it('Try to assign role2 to user1 - TODO: for now just call the validation function', async () => {
  //   await permissionExclusionsValidator.validateUserPermissions('user1', ['PERMISSIONY1'])
  // })

  // it('Check the keto relation tuples to be updated', async () => {
  //   const response = await oryKetoReadApi.getRelationTuples(
  //     'permission',
  //     undefined,
  //     'excludes'
  //   )
  //   expect(response).toHaveProperty('data')
  //   expect(response.data).toHaveProperty('relation_tuples')
  //   expect(Array.isArray(response.data.relation_tuples)).toBe(true)
  //   expect(response.data?.relation_tuples?.length).toEqual(4)
  //   const permissionCombos = _relationTuplesToPermissionCombos(response.data?.relation_tuples || [])
  //   expect(permissionCombos).toContain('PERMISSIONX1:PERMISSIONY1')
  //   expect(permissionCombos).toContain('PERMISSIONX1:PERMISSIONY2')
  //   expect(permissionCombos).toContain('PERMISSIONY1:PERMISSIONX1')
  //   expect(permissionCombos).toContain('PERMISSIONY2:PERMISSIONX1')
  // })
  // it('Add a second K8S custom resource', async () => {
  //   const status = await k8sApiCustomObjects.createNamespacedCustomObject(
  //     Config.WATCH_RESOURCE_GROUP,
  //     Config.WATCH_RESOURCE_VERSION,
  //     Config.WATCH_NAMESPACE,
  //     Config.WATCH_RESOURCE_PLURAL,
  //     sampleResource2
  //   )
  //   expect(status.response.statusCode).toEqual(201)
  // })
  // it('Wait for some time', async () => {
  //   await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  // })
  // it('Check the keto relation tuples to be updated', async () => {
  //   const response = await oryKetoReadApi.getRelationTuples(
  //     'permission',
  //     undefined,
  //     'excludes'
  //   )
  //   expect(response).toHaveProperty('data')
  //   expect(response.data).toHaveProperty('relation_tuples')
  //   expect(Array.isArray(response.data.relation_tuples)).toBe(true)
  //   expect(response.data?.relation_tuples?.length).toEqual(6)
  //   const permissionCombos = _relationTuplesToPermissionCombos(response.data?.relation_tuples || [])
  //   expect(permissionCombos).toContain('PERMISSIONX1:PERMISSIONY1')
  //   expect(permissionCombos).toContain('PERMISSIONX1:PERMISSIONY2')
  //   expect(permissionCombos).toContain('PERMISSIONY1:PERMISSIONX1')
  //   expect(permissionCombos).toContain('PERMISSIONY2:PERMISSIONX1')
  //   expect(permissionCombos).toContain('PERMISSIONX3:PERMISSIONY3')
  //   expect(permissionCombos).toContain('PERMISSIONY3:PERMISSIONX3')
  // })
  // it('Delete the first K8S custom resource', async () => {
  //   const status = await k8sApiCustomObjects.deleteNamespacedCustomObject(
  //     Config.WATCH_RESOURCE_GROUP,
  //     Config.WATCH_RESOURCE_VERSION,
  //     Config.WATCH_NAMESPACE,
  //     Config.WATCH_RESOURCE_PLURAL,
  //     sampleResource1.metadata.name
  //   )
  //   expect(status.response.statusCode).toEqual(200)
  // })
  // it('Wait for some time', async () => {
  //   await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  // })
  // it('Check the keto relation tuples to be updated', async () => {
  //   const response = await oryKetoReadApi.getRelationTuples(
  //     'permission',
  //     undefined,
  //     'excludes'
  //   )
  //   expect(response).toHaveProperty('data')
  //   expect(response.data).toHaveProperty('relation_tuples')
  //   expect(Array.isArray(response.data.relation_tuples)).toBe(true)
  //   expect(response.data?.relation_tuples?.length).toEqual(2)
  //   const permissionCombos = _relationTuplesToPermissionCombos(response.data?.relation_tuples || [])
  //   expect(permissionCombos).toContain('PERMISSIONX3:PERMISSIONY3')
  //   expect(permissionCombos).toContain('PERMISSIONY3:PERMISSIONX3')
  // })
  // it('Delete the second K8S custom resource', async () => {
  //   const status = await k8sApiCustomObjects.deleteNamespacedCustomObject(
  //     Config.WATCH_RESOURCE_GROUP,
  //     Config.WATCH_RESOURCE_VERSION,
  //     Config.WATCH_NAMESPACE,
  //     Config.WATCH_RESOURCE_PLURAL,
  //     sampleResource2.metadata.name
  //   )
  //   expect(status.response.statusCode).toEqual(200)
  // })
  // it('Wait for some time', async () => {
  //   await new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))
  // })
  // it('Check the keto relation tuples to be updated', async () => {
  //   const response = await oryKetoReadApi.getRelationTuples(
  //     'permission',
  //     undefined,
  //     'excludes'
  //   )
  //   expect(response).toHaveProperty('data')
  //   expect(response.data).toHaveProperty('relation_tuples')
  //   expect(Array.isArray(response.data.relation_tuples)).toBe(true)
  //   expect(response.data?.relation_tuples?.length).toEqual(0)
  // })
})
