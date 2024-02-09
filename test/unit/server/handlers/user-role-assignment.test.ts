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
import { PermissionExclusionsValidator, UserRole, RolePermissions, PermissionExclusions } from '../../../../src/validation/permission-exclusions'
import UserRoleAssignmentHandler from '../../../../src/server/handlers/user-role-assignment'
import { logger } from '../../../../src/shared/logger'
import { ValidationError } from '../../../../src/validation/validation-error'
import * as keto from '@ory/keto-client'

jest.mock('@ory/keto-client')
jest.mock('../../../../src/validation/permission-exclusions')
const spyCodeFn = jest.fn((code: number) => ({
  statusCode: code
}))
const toolkit: any = {
  getLogger: jest.fn(() => logger),
  response: jest.fn(() => ({
    code: spyCodeFn
  }))
}

const userRole: UserRole = {
  username: 'user1',
  roles: [
    'ROLE1',
    'ROLE2'
  ]
}
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

describe('user role assignment handlers', (): void => {
  let peValidatorInstance: any
  let oryKetoReadApi: any
  let spyGetRelationTuples: any
  beforeAll(() => {
    peValidatorInstance = (PermissionExclusionsValidator as jest.Mock).mock.instances[0]
    oryKetoReadApi = (keto.RelationshipApi as jest.Mock).mock.instances[0]
    spyGetRelationTuples = oryKetoReadApi.getRelationships as jest.Mock
    spyGetRelationTuples.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      config: {},
      headers: {},
      data: {
        relation_tuples: [
          {
            object: 'ROLE1'
          }
        ]
      }
    })
  })
  afterEach(() => {
    spyCodeFn.mockClear()
  })
  describe('AssignUserRole', (): void => {
    const request: any = {
      payload: userRole
    }
    it('Validate the user role assignment', async () => {
      await expect(UserRoleAssignmentHandler.AssignUserRole(null, request, toolkit)).resolves.toBeTruthy()
      expect((PermissionExclusionsValidator as jest.Mock).mock.instances[0].validateUserRole).toHaveBeenCalled()
    })
    it('Negative scenario1', async () => {
      const peValidatorInstance = (PermissionExclusionsValidator as jest.Mock).mock.instances[0];
      (peValidatorInstance.validateUserRole as jest.Mock).mockRejectedValue(new Error('Some error'));
      await expect(UserRoleAssignmentHandler.AssignUserRole(null, request, toolkit)).resolves.toBeTruthy()
      expect(peValidatorInstance.validateUserRole).toHaveBeenCalled()
      expect(spyCodeFn).toHaveBeenCalledWith(500)
    })
    it('Negative scenario2', async () => {
      const peValidatorInstance = (PermissionExclusionsValidator as jest.Mock).mock.instances[0];
      (peValidatorInstance.validateUserRole as jest.Mock).mockRejectedValue(new ValidationError(['Some error']));
      await expect(UserRoleAssignmentHandler.AssignUserRole(null, request, toolkit)).resolves.toBeTruthy()
      expect(peValidatorInstance.validateUserRole).toHaveBeenCalled()
      expect(spyCodeFn).toHaveBeenCalledWith(406)
    })
  })
})
