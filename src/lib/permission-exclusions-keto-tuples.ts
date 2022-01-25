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
import { PatchDelta, InternalRelationTuple } from '@ory/keto-client'
import Config from '../shared/config'
import { logger } from '../shared/logger'

class KetoTuples {
  oryKetoReadApi: keto.ReadApi;
  oryKetoWriteApi: keto.WriteApi;

  constructor () {
    this.oryKetoReadApi = new keto.ReadApi(
      undefined,
      Config.ORY_KETO_READ_SERVICE_URL
    )
    this.oryKetoWriteApi = new keto.WriteApi(
      undefined,
      Config.ORY_KETO_WRITE_SERVICE_URL
    )
  }

  /**
   * Gets all permission exclusions in the namespace from Ory Keto server.
   */
  async getAllPermissionExclusionCombos () : Promise<string[]> {
    const response = await this.oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'excludes',
      undefined,
      undefined,
      1000000
    )
    const relationTuples = response.data?.relation_tuples || []
    return relationTuples.map(tuple => {
      const permissionA = tuple.subject.replace(/permission:([^#.]*)(#.*)?/, '$1')
      return permissionA + ':' + tuple.object
    })
  }

  /**
   * Updates all the permission exclusions in Ory Keto server.
   * This function gets the permission exclusions from Keto, compare with the
   * desired permission exclusions and patches the tuples appropriately.
   * @param {permissionExclusionCombos: string[]} permissionExclusionCombos
   *  - The list of permission exclusion combination strings to update.
   */
  async updateAllPermissionExclusions (permissionExclusionCombos: string[]) : Promise<void> {
    const currentPermissionCombos = (await this.getAllPermissionExclusionCombos()) || []
    // Calculate the permissions to be deleted
    const deletePermissionCombos = currentPermissionCombos?.filter(item => !permissionExclusionCombos.includes(item))
    // Calculate the permissions to be added
    const addPermissionCombos = permissionExclusionCombos?.filter(item => !currentPermissionCombos.includes(item))

    // Construct patch delta
    // eslint-disable-next-line max-len
    const patchDeltaArr = this._generatePermissionExclusionComboPatchDeltaArray(addPermissionCombos, deletePermissionCombos)
    if (patchDeltaArr.length > 0) {
      logger.info('Patching permission exclusions in Ory Keto....')
      await this.oryKetoWriteApi.patchRelationTuples(patchDeltaArr)
    }
  }

  _generatePermissionExclusionComboPatchDeltaArray (
    addPermissionCombos: string[], deletePermissionCombos: string[]
  ): PatchDelta[] {
    let patchDeltaArray: PatchDelta[] = []
    patchDeltaArray = patchDeltaArray.concat(addPermissionCombos.map(permissionCombo => {
      const permissionArr = permissionCombo.split(':')
      return {
        action: 'insert',
        relation_tuple: this._generatePermissionTuple(permissionArr[0], permissionArr[1])
      }
    }))
    patchDeltaArray = patchDeltaArray.concat(deletePermissionCombos.map(permissionCombo => {
      const permissionArr = permissionCombo.split(':')
      return {
        action: 'delete',
        relation_tuple: this._generatePermissionTuple(permissionArr[0], permissionArr[1])
      }
    }))
    return patchDeltaArray
  }

  _generatePermissionTuple (permissionX: string, permissionY: string): InternalRelationTuple {
    return {
      namespace: 'permission',
      object: permissionY,
      relation: 'excludes',
      subject: 'permission:' + permissionX + '#granted'
    }
  }
}

export { KetoTuples }
