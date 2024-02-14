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

import * as k8s from '@kubernetes/client-node'
import Config from './config'
import ServiceConfig from './../../../src/shared/config'
// eslint-disable-next-line max-len
import { RolePermissions, PermissionExclusions } from './../../../src/validation/permission-exclusions'
import role1Resource from './data/cr-role1.json'
import role2Resource from './data/cr-role2.json'
import role3Resource from './data/cr-role3.json'
import pe1Resource from './data/cr-permission-exclusion1.json'
import pe2Resource from './data/cr-permission-exclusion2.json'

import axios from 'axios'

jest.setTimeout(50_000)

ServiceConfig.ORY_KETO_READ_SERVICE_URL = Config.ORY_KETO_READ_SERVICE_URL

const kc = new k8s.KubeConfig()
kc.loadFromDefault()

// If we want to do something in K8S, we can use the following APIs
// const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sApiCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi)
// const k8sApiPods = kc.makeApiClient(k8s.CoreV1Api)

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

const waitChanges = () => new Promise(resolve => setTimeout(resolve, Config.WAIT_TIME_MS_AFTER_K8S_RESOURCE_CHANGE))

const cleanup = async () => {
  // Remove user role assignments
  try {
    const postData = {
      username: 'user1',
      roles: []
    }
    await axios.post(Config.PERMISSION_OPERATOR_API_URL + '/assignment/user-role', postData)
  } catch (err) {}

  const cleaning = [
    // Remove role permission mappings
    role1Resource,
    role2Resource,
    role3Resource,
    // Remove permission exclusions
    pe1Resource,
    pe2Resource
  ].map(crd => k8sApiCustomObjects.deleteNamespacedCustomObject(
    Config.WATCH_RESOURCE_GROUP,
    Config.WATCH_RESOURCE_VERSION,
    Config.WATCH_NAMESPACE,
    Config.WATCH_ROLE_PERMISSIONS_RESOURCE_PLURAL,
    crd.metadata.name
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ).catch(() => {}))

  await Promise.all(cleaning)
}

describe('Permission Exclusion Validator', (): void => {
  beforeAll(async () => {
    await cleanup()
    await waitChanges()
  })
  afterAll(async () => {
    await cleanup()
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
    await waitChanges()
  })

  it('Validate role permissions', async () => {
    const postData = {
      rolePermissions,
      permissionExclusions
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/validate/role-permissions', postData))
      .resolves.toBeTruthy()
  })
  it('Validate user role assignment prior to actual assignment', async () => {
    const postData = {
      username: 'user1',
      roles: [
        'PEVALROLE1'
      ]
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/validate/user-role', postData)).resolves.toBeTruthy()
  })
  it('Assign role1 to user1', async () => {
    const postData = {
      username: 'user1',
      roles: [
        'PEVALROLE1'
      ]
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/assignment/user-role', postData))
      .resolves.toBeTruthy()
  })
  it('role permissions validation should be passed', async () => {
    const postData = {
      rolePermissions,
      permissionExclusions
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/validate/role-permissions', postData))
      .resolves.toBeTruthy()
  })
  it('Assign role1 and role2 to user1', async () => {
    const postData = {
      username: 'user1',
      roles: [
        'PEVALROLE1',
        'PEVALROLE2'
      ]
    }
    const result = await axios.post(Config.PERMISSION_OPERATOR_API_URL + '/assignment/user-role', postData)
    expect(result).toBeTruthy()
  })
  it('rolepermissions validation should be failed', async () => {
    const postData = {
      rolePermissions,
      permissionExclusions
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/validate/role-permissions', postData))
      .rejects.toThrowError()
  })
  it('Un-assign role2 from user1', async () => {
    const postData = {
      username: 'user1',
      roles: [
        'PEVALROLE1'
      ]
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/assignment/user-role', postData))
      .resolves.toBeTruthy()
  })
  it('rolepermissions validation should be passed', async () => {
    const postData = {
      rolePermissions,
      permissionExclusions
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/validate/role-permissions', postData))
      .resolves.toBeTruthy()
  })
  it('Add a permission exclusion', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
      pe1Resource
    )
    expect(status.response.statusCode).toEqual(201)
    await waitChanges()
  })

  it('Validate user role assignment prior to actual assignment', async () => {
    const postData = {
      username: 'user1',
      roles: [
        'PEVALROLE1',
        'PEVALROLE2'
      ]
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/validate/user-role', postData))
      .rejects.toThrowError()
  })
  it('Try to assign role1 and role2 to user1', async () => {
    const postData = {
      username: 'user1',
      roles: [
        'PEVALROLE1',
        'PEVALROLE2'
      ]
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/assignment/user-role', postData))
      .rejects.toThrowError()
  })

  it('Delete the permission exclusion', async () => {
    const status = await k8sApiCustomObjects.deleteNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
      pe1Resource.metadata.name
    )
    expect(status.response.statusCode).toEqual(200)
    await waitChanges()
  })

  it('Assign role1 and role2 to user1 now', async () => {
    const postData = {
      username: 'user1',
      roles: [
        'PEVALROLE1',
        'PEVALROLE2'
      ]
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/assignment/user-role', postData))
      .resolves.toBeTruthy()
  })
  it('rolepermissions validation should be failed again now', async () => {
    const postData = {
      rolePermissions,
      permissionExclusions
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/validate/role-permissions', postData))
      .rejects.toThrowError()
  })

  it('If we try to add permission exclusions after validation failure, the CR should be set with invalid status', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
      pe1Resource
    )
    expect(status.response.statusCode).toEqual(201)
    await waitChanges()
  })

  it('Status of the custom resource should be set to INVALID', async () => {
    const status = await k8sApiCustomObjects.getNamespacedCustomObjectStatus(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
      pe1Resource.metadata.name
    )
    expect(status.response.statusCode).toEqual(200)
    expect(status.body).toHaveProperty('status')
    expect((<any>status.body).status).toHaveProperty('state')
    expect((<any>status.body).status.state).not.toEqual('VALIDATED')
  })
  it('Delete the permission exclusion', async () => {
    const status = await k8sApiCustomObjects.deleteNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
      pe1Resource.metadata.name
    )
    expect(status.response.statusCode).toEqual(200)
    await waitChanges()
  })

  it('Un-assign role2 from user1', async () => {
    const postData = {
      username: 'user1',
      roles: [
        'PEVALROLE1'
      ]
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/assignment/user-role', postData))
      .resolves.toBeTruthy()
  })
  it('rolepermissions validation should be passed now', async () => {
    const postData = {
      rolePermissions,
      permissionExclusions
    }
    await expect(axios.post(Config.PERMISSION_OPERATOR_API_URL + '/validate/role-permissions', postData))
      .resolves.toBeTruthy()
  })
  it('Add permission exclusions now and check the CR status', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
      pe1Resource
    )
    expect(status.response.statusCode).toEqual(201)
    await waitChanges()
  })

  it('Status of the custom resource should be set to VALIDATED', async () => {
    const status = await k8sApiCustomObjects.getNamespacedCustomObjectStatus(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_PERMISSION_EXCLUSIONS_RESOURCE_PLURAL,
      pe1Resource.metadata.name
    )
    expect(status.response.statusCode).toEqual(200)
    expect(status.body).toHaveProperty('status')
    expect((<any>status.body).status).toHaveProperty('state')
    expect((<any>status.body).status.state).toEqual('VALIDATED')
  })
  it('Try to assign permissionY1 to rol1, CR should be rejected', async () => {
    const status = await k8sApiCustomObjects.createNamespacedCustomObject(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_ROLE_PERMISSIONS_RESOURCE_PLURAL,
      role3Resource
    )
    expect(status.response.statusCode).toEqual(201)
    await waitChanges()
  })

  it('Status of the custom resource should be set to INVALID', async () => {
    const status = await k8sApiCustomObjects.getNamespacedCustomObjectStatus(
      Config.WATCH_RESOURCE_GROUP,
      Config.WATCH_RESOURCE_VERSION,
      Config.WATCH_NAMESPACE,
      Config.WATCH_ROLE_PERMISSIONS_RESOURCE_PLURAL,
      role3Resource.metadata.name
    )
    expect(status.response.statusCode).toEqual(200)
    expect(status.body).toHaveProperty('status')
    expect((<any>status.body).status).toHaveProperty('state')
    expect((<any>status.body).status.state).not.toEqual('VALIDATED')
  })
})
