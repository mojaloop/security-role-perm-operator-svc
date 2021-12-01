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

import * as keto from '@ory/keto-client'
import { ValidationError } from './validation-error'
import { ServiceConfig } from '../shared/config'
import { logger } from '../shared/logger'

export interface RolePermissions {
  rolename: string;
  permissions: string[];
}

export interface PermissionExclusions {
  permissionsA: string[];
  permissionsB: string[];
}

export class PermissionExclusionsValidator {
  oryKetoReadApi: keto.ReadApi
  serviceConfig: ServiceConfig

  constructor (serviceConfig: ServiceConfig) {
    this.serviceConfig = serviceConfig
    this.oryKetoReadApi = new keto.ReadApi(
      undefined,
      serviceConfig.ORY_KETO_READ_SERVICE_URL
    )
  }

  async validateUserPermissions (userId: string, newPermissions: string []) : Promise<void> {
    const validationErrors : string[] = []
    // Iterate though the list of new permissions and find out if it conflicts with other permissions of the user
    logger.info(JSON.stringify(newPermissions, null, 2))
    let validationFailed = false
    for (let i = 0; i < newPermissions.length; i++) {
      try {
        const checkPermissionsExclusionsResponse = await this.oryKetoReadApi.getCheck(
          'permission',
          newPermissions[i],
          'excludes',
          userId
        )
        const permissionExclusionClash = checkPermissionsExclusionsResponse.data?.allowed || false
        if (permissionExclusionClash) {
          validationErrors.push(`ERROR: permission '${newPermissions[i]}' can not be assigned`)
          validationFailed = true
        }
      } catch (err) {}
    }
    logger.info(validationErrors)
    if (validationFailed) {
      throw new ValidationError(validationErrors)
    }
    // TODO: We can stop the validation when the first error occurs based on a config param like quickCheck
  }

  // async validateUserPermissionsWithDetails (userId: string, newPermissions: string []) : Promise<void> {
  //   // TODO: Define a model for validation error
  //   const validationErrors : string[] = []
  //   // Get the roles assigned to user
  //   let assignedRoles : string[] = []
  //   try {
  //     const readRolesResponse = await this.oryKetoReadApi.getRelationTuples(
  //       'role',
  //       undefined,
  //       'member',
  //       userId
  //     )
  //     const readRolesRelationTuples = readRolesResponse.data?.relation_tuples || []
  //     assignedRoles = readRolesRelationTuples.map(item => item.object)
  //     logger.info('Roles for the user are ....')
  //     logger.info(JSON.stringify(assignedRoles, null, 2))
  //   } catch (err) {
  //     logger.error('Unable to get roles for the user')
  //   }

  //   // Get the permissions assigned to user based on the list of roles
  //   let totalGrantedPermissions = <any>[]
  //   for (let i = 0; i < assignedRoles.length; i++) {
  //     try {
  //       const readPermissionsResponse = await this.oryKetoReadApi.getRelationTuples(
  //         'permission',
  //         undefined,
  //         'granted',
  //         'role:' + assignedRoles[i] + '#member'
  //       )
  //       const readPermissionsRelationTuples = readPermissionsResponse.data?.relation_tuples || []
  //       const grantedPermissions = readPermissionsRelationTuples.map(item => item.object)
  //       totalGrantedPermissions = totalGrantedPermissions.concat(grantedPermissions)
  //     } catch (err) {}
  //   }
  //   logger.info('Permissions granted for the user are ....')
  //   logger.info(JSON.stringify(totalGrantedPermissions, null, 2))

  //   // Iterate through new permissions and get the list of excluded permissions
  //   let totalPermissionExclusions: string[] = []
  //   for (let i = 0; i < totalGrantedPermissions.length; i++) {
  //     try {
  //       const readPermissionsExclusionsResponse = await this.oryKetoReadApi.getRelationTuples(
  //         'permission',
  //         undefined,
  //         'excludes',
  //         'permission:' + totalGrantedPermissions[i]
  //       )
  //       const permissionExclusionsRelationTuples = readPermissionsExclusionsResponse.data?.relation_tuples || []
  //       const permissionExclusions = permissionExclusionsRelationTuples.map(item => item.object)
  //       totalPermissionExclusions = totalPermissionExclusions.concat(permissionExclusions)
  //     } catch (err) {}
  //     logger.info(JSON.stringify(totalPermissionExclusions, null, 2))
  //   }

  //   // Check the new permissions permissions with the excluded permissions
  //   logger.info(JSON.stringify(newPermissions, null, 2))
  //   for (let i = 0; i < newPermissions.length; i++) {
  //     if (totalPermissionExclusions.includes(newPermissions[i])) {
  //       logger.error(`Can not assign the permission ${newPermissions[i]}`)
  //     }
  //   }

  //   // Don't stop the validation for the first error
  //   // Return list of all the validation errors
  //   // (This functionality can be configurable)
  // }

  _getPermissionExclusionsForPermission (
    permission: string,
    permissionExclusions: PermissionExclusions[]
  ) : Set<string> {
    const permissionExclusionsSet: Set<string> = new Set()
    const permissionExclusionsFoundInSetA = permissionExclusions.filter(item => item.permissionsA.includes(permission))
    const permissionExclusionsFoundInSetB = permissionExclusions.filter(item => item.permissionsB.includes(permission))
    permissionExclusionsFoundInSetA.forEach(item => {
      item.permissionsB.forEach(perm => permissionExclusionsSet.add(perm))
    })
    permissionExclusionsFoundInSetB.forEach(item => {
      item.permissionsA.forEach(perm => permissionExclusionsSet.add(perm))
    })
    return permissionExclusionsSet
  }

  validateUserPermissionsValid (
    userRoles: string[],
    rolePermissions: RolePermissions [],
    permissionExclusions: PermissionExclusions[]
  ) : void {
    const validationErrors : string[] = []
    // Get the permissions assigned to user based on the list of roles
    const totalGrantedPermissions : Set<string> = new Set()
    for (let i = 0; i < userRoles.length; i++) {
      const roleItem = rolePermissions.find(item => item.rolename === userRoles[i])
      if (roleItem) {
        roleItem.permissions.forEach(perm => totalGrantedPermissions.add(perm))
      }
    }
    // logger.info('Permissions granted for the user are ....')
    // console.log(totalGrantedPermissions)

    // Iterate through permissions and get the set of excluded permissions
    const totalPermissionExclusions: Set<string> = new Set()
    // for (let i = 0; i < totalGrantedPermissions.size; i++) {
    totalGrantedPermissions.forEach(grantedPerm => {
      try {
        // eslint-disable-next-line max-len
        const permissionExclusionsForPermission = this._getPermissionExclusionsForPermission(grantedPerm, permissionExclusions)
        permissionExclusionsForPermission.forEach(perm => totalPermissionExclusions.add(perm))
      } catch (err) {}
    })
    // console.log(totalGrantedPermissions, totalPermissionExclusions)

    // Check the new permissions permissions with the excluded permissions using set intersection
    const intersect = new Set([...totalGrantedPermissions].filter(i => totalPermissionExclusions.has(i)))
    // console.log('Intersection is', intersect)
    if (intersect.size > 0) {
      validationErrors.push('ERROR: permissions ' + Array.from(intersect).join(',') + ' can not co-exist')
      throw new ValidationError(validationErrors)
    }
  }

  // Example scenario
  // Current Assignments:
  // ROLE1: PA1, PA2
  // ROLE2: PB1

  // PB2:PA2

  // Incoming Change:

  // ROLE2: PB1, PB2
  // ROLE3: PB2, PC1
  // ROLE4: PB1

  // PC2:PB1
  // PB2:PA2 (D)
}
