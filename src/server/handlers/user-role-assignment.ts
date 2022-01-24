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

// import btoa from 'btoa'
import { StateResponseToolkit } from '~/server/plugins/state'
import { Request, ResponseObject } from '@hapi/hapi'
import { PermissionExclusionsValidator, UserRole } from '../../validation/permission-exclusions'
import { ValidationError } from '../../validation/validation-error'
import Config from '../../shared/config'
import * as keto from '@ory/keto-client'

interface AssignmentErrorResponse {
  isCreated: boolean;
  errors: string[];
}

const oryKetoReadApi: keto.ReadApi = new keto.ReadApi(
  undefined,
  Config.ORY_KETO_READ_SERVICE_URL
)

const oryKetoWriteApi: keto.WriteApi = new keto.WriteApi(
  undefined,
  Config.ORY_KETO_WRITE_SERVICE_URL
)

const permissionExclusionsValidator = new PermissionExclusionsValidator(Config)

// eslint-disable-next-line max-len
const AssignUserRole = async (_context: unknown, _request: Request, h: StateResponseToolkit): Promise<ResponseObject> => {
  try {
    const response = {}
    const userRole : UserRole = <UserRole>_request.payload
    try {
      await permissionExclusionsValidator.validateUserRole(userRole)

      // Get current role assignments
      const responseGetCurrentRoles = await oryKetoReadApi.getRelationTuples(
        'role',
        undefined,
        'member',
        userRole.username,
        undefined,
        1000000
      )
      const currentRoles = responseGetCurrentRoles.data?.relation_tuples?.map(({ object }) => object) || []
      // Get the difference
      const patchDeltaArr = _generateUserRolesPatchDeltaArray(currentRoles, userRole.roles, userRole.username)
      // Apply patch
      await oryKetoWriteApi.patchRelationTuples(patchDeltaArr)
      h.response().code(200)
    } catch (err) {
      if (err instanceof ValidationError) {
        const errorResponse: AssignmentErrorResponse = {
          isCreated: false,
          errors: err.validationErrors
        }
        console.log(errorResponse)
        return h.response(errorResponse).code(406)
      } else {
        console.log(err)
        throw err
      }
    }
    return h.response(response).code(200)
  } catch (e) {
    h.getLogger().error(e)
    return h.response().code(500)
  }
}

const _generateUserRolesPatchDeltaArray = (
  currentRoles: string[], newRoles: string[], username: string
): keto.PatchDelta[] => {
  // Calculate the roles to be deleted
  const deleteRoles = currentRoles?.filter(item => !newRoles.includes(item))
  // Calculate the permissions to be added
  const addRoles = newRoles?.filter(item => !currentRoles.includes(item))
  let patchDeltaArray: keto.PatchDelta[] = []
  patchDeltaArray = patchDeltaArray.concat(addRoles.map(role => {
    return {
      action: 'insert',
      relation_tuple: {
        namespace: 'role',
        object: role,
        relation: 'member',
        subject: username
      }
    }
  }))
  patchDeltaArray = patchDeltaArray.concat(deleteRoles.map(role => {
    return {
      action: 'delete',
      relation_tuple: {
        namespace: 'role',
        object: role,
        relation: 'member',
        subject: username
      }
    }
  }))
  return patchDeltaArray
}

export default {
  AssignUserRole
}
