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

import * as keto from '@ory/keto-client'
import { Request, ResponseObject } from '@hapi/hapi'
import { StateResponseToolkit } from '~/server/plugins/state'
import { PermissionExclusionsValidator, UserRole } from '../../validation/permission-exclusions'
import { ValidationError } from '../../validation/validation-error'
import { logger } from '../../shared/logger'
import Config from '../../shared/config'

import { KETO_NAMESPACES, KETO_RELATIONS, PAGE_SIZE } from '../../constants'

interface AssignmentErrorResponse {
  isCreated: boolean;
  errors: string[];
}

const relationshipApi = new keto.RelationshipApi(
  undefined,
  Config.ORY_KETO_READ_SERVICE_URL
)

const adminRelationshipApi = new keto.RelationshipApi(
  undefined,
  Config.ORY_KETO_WRITE_SERVICE_URL
)

const permissionExclusionsValidator = new PermissionExclusionsValidator(Config)

const AssignUserRole = async (
  _context: unknown,
  _request: Request,
  h: StateResponseToolkit
): Promise<ResponseObject> => {
  const response = {}

  try {
    const userRole : UserRole = <UserRole>_request.payload
    await permissionExclusionsValidator.validateUserRole(userRole)

    // Get current role assignments
    const responseGetCurrentRoles = await relationshipApi.getRelationships({
      namespace: KETO_NAMESPACES.role,
      relation: KETO_RELATIONS.member,
      subjectId: userRole.username,
      pageSize: PAGE_SIZE
    })
    const currentRoles = responseGetCurrentRoles.data?.relation_tuples?.map(({ object }) => object) || []
    // Get the difference
    const relationshipPatch = _generateUserRolesPatchDeltaArray(currentRoles, userRole.roles, userRole.username)
    // Apply patch
    await adminRelationshipApi.patchRelationships({ relationshipPatch })
    h.response().code(200)
  } catch (err) {
    if (err instanceof Error) logger.error(`error in AssignUserRole: ${err.message}`)

    if (err instanceof ValidationError) {
      const errorResponse: AssignmentErrorResponse = {
        isCreated: false,
        errors: err.validationErrors
      }
      return h.response(errorResponse).code(406)
    }

    h.getLogger().error(err)
    return h.response().code(500)
  }

  return h.response(response).code(200)
}

const _generateUserRolesPatchDeltaArray = (
  currentRoles: string[], newRoles: string[], username: string
): keto.RelationshipPatch[] => {
  // Calculate the roles to be deleted
  const deleteRoles = currentRoles?.filter(item => !newRoles.includes(item)) || []
  // Calculate the permissions to be added
  const addRoles = newRoles?.filter(item => !currentRoles.includes(item)) || []
  let patchDeltaArray: keto.RelationshipPatch[] = []

  const createRelationTuple = (role: string): keto.Relationship => ({
    namespace: KETO_NAMESPACES.role,
    object: role,
    relation: KETO_RELATIONS.member,
    subject_id: username
  })

  patchDeltaArray = patchDeltaArray.concat(addRoles.map(role => {
    return {
      action: keto.RelationshipPatchActionEnum.Insert,
      relation_tuple: createRelationTuple(role)
    }
  }))
  patchDeltaArray = patchDeltaArray.concat(deleteRoles.map(role => {
    return {
      action: keto.RelationshipPatchActionEnum.Delete,
      relation_tuple: createRelationTuple(role)
    }
  }))
  return patchDeltaArray
}

export default {
  AssignUserRole
}
