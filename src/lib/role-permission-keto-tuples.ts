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

import {
  RelationshipApi,
  Relationship, RelationshipPatch, RelationshipPatchActionEnum
} from '@ory/keto-client'

import Config from '../shared/config'
import { logger } from '../shared/logger'
import { KETO_NAMESPACES, KETO_RELATIONS, PAGE_SIZE } from '../constants'

class KetoTuples {
  relationshipApi: RelationshipApi
  adminRelationshipApi: RelationshipApi

  constructor () {
    this.relationshipApi = new RelationshipApi(undefined, Config.ORY_KETO_READ_SERVICE_URL)
    this.adminRelationshipApi = new RelationshipApi(undefined, Config.ORY_KETO_WRITE_SERVICE_URL)
  }

  /**
   * Gets all roles and permissions in the namespace from Ory Keto server.
   */
  async getAllRolePermissionCombos () : Promise<string[]> {
    const response = await this.relationshipApi.getRelationships({
      namespace: KETO_NAMESPACES.permission,
      relation: KETO_RELATIONS.granted,
      pageSize: PAGE_SIZE
    })

    const relationTuples = response.data?.relation_tuples || []
    return relationTuples.map(tuple => {
      const role = tuple.subject_set?.object
      return role + ':' + tuple.object
    })
  }

  /**
   * Updates all the permissions in Ory Keto server.
   * This function gets the permissions from Keto, compare with the
   * desired permissions and patches the tuples appropriately.
   * @param {rolePermissionCombos: string[]} rolePermissionCombos
   *  - The list of role and permission combination strings to update.
   */
  async updateAllRolePermissions (rolePermissionCombos: string[]) : Promise<void> {
    const currentPermissionCombos = (await this.getAllRolePermissionCombos()) || []
    // Calculate the permissions to be deleted
    const deletePermissionCombos = currentPermissionCombos?.filter(item => !rolePermissionCombos?.includes(item))
    // Calculate the permissions to be added
    const addPermissionCombos = rolePermissionCombos?.filter(item => !currentPermissionCombos.includes(item))

    // Construct patch delta
    const relationshipPatch = this._generateRolePermissionComboPatchDeltaArray(
      addPermissionCombos, deletePermissionCombos
    )
    if (relationshipPatch.length > 0) {
      logger.info('Patching permissions in Ory Keto....')
      await this.adminRelationshipApi.patchRelationships({ relationshipPatch })
    }
  }

  _generateRolePermissionComboPatchDeltaArray (
    addPermissionCombos: string[] = [], deletePermissionCombos: string[] = []
  ): RelationshipPatch[] {
    let patchDeltaArray: RelationshipPatch[] = []

    patchDeltaArray = patchDeltaArray.concat(addPermissionCombos.map(permissionCombo => {
      const rolePermissionArr = permissionCombo.split(':')
      return {
        action: RelationshipPatchActionEnum.Insert,
        relation_tuple: this._generatePermissionTuple(rolePermissionArr[0], rolePermissionArr[1])
      }
    }))
    patchDeltaArray = patchDeltaArray.concat(deletePermissionCombos.map(permissionCombo => {
      const rolePermissionArr = permissionCombo.split(':')
      return {
        action: RelationshipPatchActionEnum.Delete,
        relation_tuple: this._generatePermissionTuple(rolePermissionArr[0], rolePermissionArr[1])
      }
    }))

    return patchDeltaArray
  }

  _generatePermissionTuple (role: string, permission: string): Relationship {
    return {
      namespace: KETO_NAMESPACES.permission,
      object: permission,
      relation: KETO_RELATIONS.granted,
      subject_set: {
        namespace: KETO_NAMESPACES.role,
        object: role,
        relation: KETO_RELATIONS.member
      }
    }
  }
}

export { KetoTuples }
