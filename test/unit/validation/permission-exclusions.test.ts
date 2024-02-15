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

// eslint-disable-next-line max-len
import { PermissionExclusionsValidator, UserRole, RolePermissions, PermissionExclusions } from '../../../src/validation/permission-exclusions'
import Config from '../../../src/shared/config'
import { ValidationError } from '../../../src/validation/validation-error'
import * as keto from '@ory/keto-client'

jest.mock('@ory/keto-client')

const permissionExclusionsValidator = new PermissionExclusionsValidator(Config)

describe('permission-exclusions', (): void => {
  describe('validateUserRolePermissions', (): void => {
    describe('Happy Path', (): void => {
      it('Validate the permission exclusion', async () => {
        const userRoles: UserRole[] = [
          {
            username: 'user1',
            roles: [
              'ROLE1',
              'ROLE2'
            ]
          }
        ]
        const rolePermissions: RolePermissions[] = [
          {
            rolename: 'ROLE1',
            permissions: [
              'PERMA1',
              'PERMA2'
            ]
          },
          {
            rolename: 'ROLE2',
            permissions: [
              'PERMB1',
              'PERMB2'
            ]
          }
        ]
        const permissionExclusions: PermissionExclusions[] = [
          {
            permissionsA: [
              'PERMA1'
            ],
            permissionsB: [
              'PERMC1'
            ]
          }
        ]
        expect(() => permissionExclusionsValidator.validateUserRolePermissions(userRoles, rolePermissions, permissionExclusions)).not.toThrowError()
      })
      it('Validate the permission exclusion', async () => {
        const userRoles: UserRole[] = [
          {
            username: 'user1',
            roles: [
              'ROLE1'
            ]
          }
        ]
        const rolePermissions: RolePermissions[] = [
          {
            rolename: 'ROLE1',
            permissions: [
              'PERMA1',
              'PERMA2'
            ]
          },
          {
            rolename: 'ROLE2',
            permissions: [
              'PERMB1',
              'PERMB2'
            ]
          }
        ]
        const permissionExclusions: PermissionExclusions[] = [
          {
            permissionsA: [
              'PERMA1'
            ],
            permissionsB: [
              'PERMB1'
            ]
          }
        ]
        expect(() => permissionExclusionsValidator.validateUserRolePermissions(userRoles, rolePermissions, permissionExclusions)).not.toThrowError()
      })
    })
    describe('Unhappy Path', (): void => {
      it('Validate the permission exclusion', async () => {
        const userRoles: UserRole[] = [
          {
            username: 'user1',
            roles: [
              'ROLE1',
              'ROLE2'
            ]
          }
        ]
        const rolePermissions: RolePermissions[] = [
          {
            rolename: 'ROLE1',
            permissions: [
              'PERMA1',
              'PERMA2'
            ]
          },
          {
            rolename: 'ROLE2',
            permissions: [
              'PERMB1',
              'PERMB2'
            ]
          }
        ]
        const permissionExclusions: PermissionExclusions[] = [
          {
            permissionsA: [
              'PERMA1'
            ],
            permissionsB: [
              'PERMB1',
              'PERMA2'
            ]
          }
        ]
        expect(() => permissionExclusionsValidator.validateUserRolePermissions(userRoles, rolePermissions, permissionExclusions)).toThrow(ValidationError)
      })
    })
  })
  describe('validateRolePermissionsAndPermissionExclusions', (): void => {
    describe('Happy Path', (): void => {
      let spyGetRelationTuples: jest.Mock
      beforeAll(() => {
        spyGetRelationTuples = permissionExclusionsValidator.relationshipApi.getRelationships as jest.Mock
        const sampleRelationTupleData = {
          relation_tuples: [
            {
              namespace: 'role',
              object: 'ROLE1',
              relation: 'member',
              subject: 'user1'
            }
          ]
        }
        spyGetRelationTuples.mockResolvedValue({
          status: 200,
          statusText: 'OK',
          config: {},
          headers: {},
          data: sampleRelationTupleData
        })
      })
      it('Validate the role permissions and permission exclusion', async () => {
        const rolePermissions: RolePermissions[] = [
          {
            rolename: 'ROLE1',
            permissions: [
              'PERMA1',
              'PERMA2'
            ]
          },
          {
            rolename: 'ROLE2',
            permissions: [
              'PERMB1',
              'PERMB2'
            ]
          }
        ]
        const permissionExclusions: PermissionExclusions[] = [
          {
            permissionsA: [
              'PERMA1'
            ],
            permissionsB: [
              'PERMC1'
            ]
          }
        ]
        permissionExclusionsValidator.validateRolePermissionsAndPermissionExclusions(rolePermissions, permissionExclusions)
      })
    })
  })
  describe('validatePermissionExclusions', (): void => {
    describe('Happy Path', (): void => {
      let spyGetRelationTuples: jest.Mock
      beforeAll(() => {
        spyGetRelationTuples = permissionExclusionsValidator.relationshipApi.getRelationships as jest.Mock
        const sampleRelationTupleData1 = {
          relation_tuples: [
            {
              namespace: 'permission',
              object: 'PERMA1',
              relation: 'granted',
              subject: 'role:ROLE1'
            },
            {
              namespace: 'permission',
              object: 'PERMA2',
              relation: 'granted',
              subject: 'role:ROLE1'
            },
            {
              namespace: 'permission',
              object: 'PERMB1',
              relation: 'granted',
              subject: 'role:ROLE2'
            },
            {
              namespace: 'permission',
              object: 'PERMB2',
              relation: 'granted',
              subject: 'role:ROLE2'
            }
          ]
        }
        spyGetRelationTuples.mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          config: {},
          headers: {},
          data: sampleRelationTupleData1
        })
        const sampleRelationTupleData2 = {
          relation_tuples: [
            {
              namespace: 'role',
              object: 'ROLE1',
              relation: 'member',
              subject: 'user1'
            }
          ]
        }
        spyGetRelationTuples.mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          config: {},
          headers: {},
          data: sampleRelationTupleData2
        })
      })
      it('Validate the role permissions and permission exclusion', async () => {
        const permissionExclusions: PermissionExclusions[] = [
          {
            permissionsA: [
              'PERMA1'
            ],
            permissionsB: [
              'PERMC1'
            ]
          }
        ]
        permissionExclusionsValidator.validatePermissionExclusions(permissionExclusions)
      })
    })
  })
  describe('validateUserRole', (): void => {
    describe('Happy Path', (): void => {
      let spyGetRelationTuples: jest.Mock
      beforeAll(() => {
        spyGetRelationTuples = permissionExclusionsValidator.relationshipApi.getRelationships as jest.Mock
        const sampleRelationTupleData1 = {
          relation_tuples: [
            {
              namespace: 'permission',
              object: 'PERMA1',
              relation: 'granted',
              subject: 'role:ROLE1'
            },
            {
              namespace: 'permission',
              object: 'PERMA2',
              relation: 'granted',
              subject: 'role:ROLE1'
            },
            {
              namespace: 'permission',
              object: 'PERMB1',
              relation: 'granted',
              subject: 'role:ROLE2'
            },
            {
              namespace: 'permission',
              object: 'PERMB2',
              relation: 'granted',
              subject: 'role:ROLE2'
            }
          ]
        }
        spyGetRelationTuples.mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          config: {},
          headers: {},
          data: sampleRelationTupleData1
        })
        const sampleRelationTupleData2 = {
          relation_tuples: [
            {
              namespace: 'permission',
              object: 'PERMA1',
              relation: 'excludes',
              subject: 'permission:PERMC1'
            }
          ]
        }
        spyGetRelationTuples.mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          config: {},
          headers: {},
          data: sampleRelationTupleData2
        })
      })
      it('Validate the role permissions and permission exclusion', async () => {
        const userRole = {
          username: 'user1',
          roles: [
            'ROLE1',
            'ROLE2'
          ]
        }
        await expect(permissionExclusionsValidator.validateUserRole(userRole)).resolves.toBe(undefined)
      })
    })
  })
  describe('validateRolePermissions', (): void => {
    describe('Happy Path', (): void => {
      let spyGetRelationTuples: jest.Mock
      beforeAll(() => {
        spyGetRelationTuples = permissionExclusionsValidator.relationshipApi.getRelationships as jest.Mock
        const sampleRelationTupleData1 = {
          relation_tuples: [
            {
              namespace: 'permission',
              object: 'PERMA1',
              relation: 'excludes',
              subject: 'permission:PERMC1'
            }
          ]
        }
        spyGetRelationTuples.mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          config: {},
          headers: {},
          data: sampleRelationTupleData1
        })
        const sampleRelationTupleData2 = {
          relation_tuples: [
            {
              namespace: 'role',
              object: 'ROLE1',
              relation: 'member',
              subject: 'user1'
            }
          ]
        }
        spyGetRelationTuples.mockResolvedValueOnce({
          status: 200,
          statusText: 'OK',
          config: {},
          headers: {},
          data: sampleRelationTupleData2
        })
      })
      it('Validate the role permissions and permission exclusion', async () => {
        const rolePermissions: RolePermissions[] = [
          {
            rolename: 'ROLE1',
            permissions: [
              'PERMA1',
              'PERMA2'
            ]
          },
          {
            rolename: 'ROLE2',
            permissions: [
              'PERMB1',
              'PERMB2'
            ]
          }
        ]
        await expect(permissionExclusionsValidator.validateRolePermissions(rolePermissions)).resolves.toBe(undefined)
      })
    })
  })
})
