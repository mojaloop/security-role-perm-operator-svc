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
import { PermissionExclusionsValidator, UserRole, RolePermissions, PermissionExclusions } from '../../validation/permission-exclusions'
import { ValidationError } from '../../validation/validation-error'
import Config from '../../shared/config'

interface ValidationErrorResponse {
  isValid: boolean;
  errors: string[];
}

const permissionExclusionsValidator = new PermissionExclusionsValidator(Config)

// eslint-disable-next-line max-len
const ValidateUserRole = async (_context: unknown, _request: Request, h: StateResponseToolkit): Promise<ResponseObject> => {
  try {
    const response = {}
    const userRole : UserRole = <UserRole>_request.payload
    try {
      await permissionExclusionsValidator.validateUserRole(userRole)
    } catch (err) {
      if (err instanceof ValidationError) {
        const errorResponse: ValidationErrorResponse = {
          isValid: false,
          errors: err.validationErrors
        }
        return h.response(errorResponse).code(406)
      } else {
        throw err
      }
    }
    return h.response(response).code(200)
  } catch (e) {
    h.getLogger().error(e)
    return h.response().code(500)
  }
}

// eslint-disable-next-line max-len
const ValidateRolePermissions = async (_context: unknown, _request: Request, h: StateResponseToolkit): Promise<ResponseObject> => {
  try {
    const response = {}
    const requestObject: any = _request.payload
    const rolePermissions : RolePermissions[] = requestObject?.rolePermissions
    const permissionExclusions : PermissionExclusions[] = requestObject?.permissionExclusions
    try {
      await permissionExclusionsValidator.validateRolePermissionsAndPermissionExclusions(rolePermissions, permissionExclusions)
    } catch (err) {
      if (err instanceof ValidationError) {
        const errorResponse: ValidationErrorResponse = {
          isValid: false,
          errors: err.validationErrors
        }
        return h.response(errorResponse).code(406)
      } else {
        throw err
      }
    }
    return h.response(response).code(200)
  } catch (e) {
    h.getLogger().error(e)
    return h.response().code(500)
  }
}

export default {
  ValidateUserRole,
  ValidateRolePermissions
}
