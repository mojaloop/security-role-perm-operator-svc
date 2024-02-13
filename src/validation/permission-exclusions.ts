/* eslint-disable max-len */
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
import { KETO_NAMESPACES, KETO_RELATIONS, PAGE_SIZE } from '../constants'

export interface UserRole {
  username: string;
  roles: string[];
}

export interface RolePermissions {
  rolename: string;
  permissions: string[];
}

export interface PermissionExclusions {
  permissionsA: string[];
  permissionsB: string[];
}

export interface PermissionExclusionCombos {
  permissionA: string;
  permissionB: string | undefined;
}

export function isPermissionExclusionCombos (obj: PermissionExclusions | PermissionExclusionCombos): boolean {
  return 'permissionA' in obj
}

export class PermissionExclusionsValidator {
  relationshipApi: keto.RelationshipApi
  serviceConfig: ServiceConfig

  constructor (serviceConfig: ServiceConfig) {
    this.serviceConfig = serviceConfig
    this.relationshipApi = new keto.RelationshipApi(
      undefined,
      serviceConfig.ORY_KETO_READ_SERVICE_URL
    )
  }

  _getPermissionExclusionsForPermission (
    permission: string,
    permissionExclusions: PermissionExclusions[] | PermissionExclusionCombos[]
  ) : Set<string> {
    const permissionExclusionsSet: Set<string> = new Set()
    if (permissionExclusions.length <= 0) {
      return permissionExclusionsSet
    }

    if (isPermissionExclusionCombos(permissionExclusions[0])) {
      const castedPermissionExclusions = <PermissionExclusionCombos[]>permissionExclusions
      castedPermissionExclusions
        .filter(item => item.permissionA === permission)
        .forEach(perm => permissionExclusionsSet.add(perm.permissionB || ''))
      castedPermissionExclusions
        .filter(item => item.permissionB === permission)
        .forEach(perm => permissionExclusionsSet.add(perm.permissionA))
    } else {
      const castedPermissionExclusions = <PermissionExclusions[]>permissionExclusions
      const permissionExclusionsFoundInSetA = castedPermissionExclusions
        .filter(item => item.permissionsA.includes(permission))
      const permissionExclusionsFoundInSetB = castedPermissionExclusions
        .filter(item => item.permissionsB.includes(permission))
      permissionExclusionsFoundInSetA.forEach(item => {
        item.permissionsB.forEach(perm => permissionExclusionsSet.add(perm))
      })
      permissionExclusionsFoundInSetB.forEach(item => {
        item.permissionsA.forEach(perm => permissionExclusionsSet.add(perm))
      })
    }
    return permissionExclusionsSet
  }

  validateUserRolePermissions (
    userRoles: UserRole[],
    rolePermissions: RolePermissions [],
    permissionExclusions: PermissionExclusions[] | PermissionExclusionCombos[]
  ) : void {
    const validationErrors : string[] = []
    // Construct a map for role and its permission exclusions
    const rolePermissionExclusions: Map<string, Set<string>> = new Map()
    rolePermissions.forEach(role => {
      // Iterate through permissions and get the set of excluded permissions
      const permissionExclusionsSet: Set<string> = new Set()
      role.permissions.forEach(grantedPerm => {
        try {
          const permissionExclusionsForPermission = this._getPermissionExclusionsForPermission(
            grantedPerm,
            permissionExclusions
          )
          permissionExclusionsForPermission.forEach(perm => permissionExclusionsSet.add(perm))
        } catch (err) {}
      })
      rolePermissionExclusions.set(role.rolename, permissionExclusionsSet)
    })

    // Get the permissions assigned and excluded to user based on the list of roles assigned to that user
    userRoles.forEach(user => {
      const totalGrantedPermissions : Set<string> = new Set()
      const totalExcludedPermissions : Set<string> = new Set()
      for (let i = 0; i < user.roles.length; i++) {
        const roleItem = rolePermissions.find(item => item.rolename === user.roles[i])
        if (roleItem) {
          roleItem.permissions.forEach(perm => totalGrantedPermissions.add(perm))
          const permExclusions = rolePermissionExclusions.get(roleItem.rolename)
          if (permExclusions) {
            permExclusions.forEach(permExclusion => totalExcludedPermissions.add(permExclusion))
          }
        }
      }
      // Check the new permissions with the excluded permissions using set intersection
      const intersect = new Set([...totalGrantedPermissions].filter(i => totalExcludedPermissions.has(i)))
      if (intersect.size > 0) {
        validationErrors.push(
          'ERROR: permissions ' +
          Array.from(intersect).join(',') +
          ` can not be assigned together for the user: ${user.username}`
        )
      }
    })
    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors)
    }
  }

  async validateRolePermissionsAndPermissionExclusions (
    rolePermissions: RolePermissions [],
    permissionExclusions: PermissionExclusions[] | PermissionExclusionCombos[]
  ) : Promise<void> {
    // Iterate through all the role permissions and get the user list
    const userRoles : Map<string, string[]> = new Map()
    for (let i = 0; i < rolePermissions.length; i++) {
      try {
        const readRolesResponse = await this.relationshipApi.getRelationships({
          namespace: KETO_NAMESPACES.role,
          object: rolePermissions[i].rolename,
          relation: KETO_RELATIONS.member,
          pageSize: PAGE_SIZE
        })

        const readRolesRelationTuples: keto.Relationship[] = readRolesResponse.data?.relation_tuples || []
        readRolesRelationTuples.forEach(relationTuple => {
          const user = relationTuple.subject_id || ''
          if (!userRoles.has(user)) {
            userRoles.set(user, [])
          }
          userRoles.get(user)?.push(rolePermissions[i].rolename)
        })
      } catch (err) {
        logger.error('Unable to get roles for the user')
      }
    }
    const userRolesArray = Array.from(userRoles, ([username, roles]) => ({ username, roles }))
    this.validateUserRolePermissions(userRolesArray, rolePermissions, permissionExclusions)
  }

  async validateUserRole (userRole: UserRole) : Promise<void> {
    // const validationErrors : string[] = []
    // Iterate through all the roles and get the role permission mappings
    const rolePermissions: RolePermissions[] = []
    for (let i = 0; i < userRole.roles.length; i++) {
      const readRolePermissionsResponse = await this.relationshipApi.getRelationships({
        namespace: KETO_NAMESPACES.permission,
        relation: KETO_RELATIONS.granted,
        subjectId: `role:${userRole.roles[i]}#member`,
        pageSize: PAGE_SIZE
      })
      const readRolePermissionsRelationTuples: keto.Relationship[] = readRolePermissionsResponse.data?.relation_tuples || []
      const permissions = readRolePermissionsRelationTuples.map(item => item.object)
      rolePermissions.push({
        rolename: userRole.roles[i],
        permissions
      })
    }

    // Get all the permission exclusions
    // let permissionExclusionCombos: PermissionExclusionCombos[]
    const readPermissionExclusionsResponse = await this.relationshipApi.getRelationships({
      namespace: KETO_NAMESPACES.permission,
      relation: KETO_RELATIONS.excludes,
      pageSize: PAGE_SIZE
    })
    const readPermissionExclusionsRelationTuples: keto.Relationship[] = readPermissionExclusionsResponse.data?.relation_tuples || []
    const permissionExclusionCombos: PermissionExclusionCombos[] = readPermissionExclusionsRelationTuples.map(item => {
      return {
        permissionA: item.object,
        permissionB: item.subject_id?.replace(/permission:([^#.]*)(#.*)?/, '$1')
      }
    })
    this.validateUserRolePermissions([userRole], rolePermissions, permissionExclusionCombos)
  }

  async validatePermissionExclusions (permissionExclusions: PermissionExclusions[]) : Promise<void> {
    // Get all the role permission mappings
    const roles: any = {}
    const readRolePermissionsResponse = await this.relationshipApi.getRelationships({
      namespace: KETO_NAMESPACES.permission,
      relation: KETO_RELATIONS.granted,
      pageSize: PAGE_SIZE
    })

    const readRolePermissionsRelationTuples: keto.Relationship[] = readRolePermissionsResponse.data?.relation_tuples || []
    readRolePermissionsRelationTuples.forEach(rolePermission => {
      const rolename = rolePermission.subject_id?.replace(/role:([^#.]*)(#.*)?/, '$1') || ''
      const permissions = rolePermission.object
      if (!roles[rolename]) {
        roles[rolename] = []
      }
      roles[rolename] = roles[rolename].concat(permissions)
    })
    const rolePermissions: RolePermissions[] = Object.entries(roles).map(item => {
      return {
        rolename: item[0],
        permissions: <string[]>item[1]
      }
    })

    await this.validateRolePermissionsAndPermissionExclusions(rolePermissions, permissionExclusions)
  }

  async validateRolePermissions (rolePermissions: RolePermissions[]) : Promise<void> {
    // Get all the permission exclusions
    // let permissionExclusionCombos: PermissionExclusionCombos[]
    const readPermissionExclusionsResponse = await this.relationshipApi.getRelationships({
      namespace: KETO_NAMESPACES.permission,
      relation: KETO_RELATIONS.excludes,
      pageSize: PAGE_SIZE
    })

    // eslint-disable-next-line max-len
    const readPermissionExclusionsRelationTuples: keto.Relationship[] = readPermissionExclusionsResponse.data?.relation_tuples || []
    const permissionExclusionCombos: PermissionExclusionCombos[] = readPermissionExclusionsRelationTuples.map(item => {
      return {
        permissionA: item.object,
        permissionB: item.subject_id?.replace(/permission:([^#.]*)(#.*)?/, '$1')
      }
    })
    await this.validateRolePermissionsAndPermissionExclusions(rolePermissions, permissionExclusionCombos)
  }
}
