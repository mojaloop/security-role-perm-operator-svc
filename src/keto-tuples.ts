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

import * as keto from '@ory/keto-client';
import { PatchDelta, InternalRelationTuple } from '@ory/keto-client';
import Config from './shared/config';

class KetoTuples {

  oryKetoReadApi: keto.ReadApi;
  oryKetoWriteApi: keto.WriteApi;

  constructor() {
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
   * Gets permissions of specified role from Ory Keto server.
   * @param {string} roleName - The role name.
   */
  async getRolePermissions (roleName: string) {
    const response = await this.oryKetoReadApi.getRelationTuples(
      'permission',
      undefined,
      'granted',
      'role:' + roleName + '#member'
    )
    return response.data?.relation_tuples?.map(item => item.object)
  }

  /**
   * Updates permissions of specified role in Ory Keto server.
   * This function gets the permissions from Keto, compare with the desired permissions and patches the tuples appropriately.
   * @param {string} roleName - The role name.
   * @param {string[]} permissions - The list of permissions to update.
   */
  async updateRolePermissions (roleName: string, permissions: string[]) {
    const currentPermissions = (await this.getRolePermissions(roleName)) || []
    // Calculate the permissions to be deleted
    const deletePermissions = currentPermissions?.filter(item => !permissions.includes(item))
    // Calculate the permissions to be added
    const addPermissions = permissions?.filter(item => !currentPermissions.includes(item))
    // Construct patch delta
    const patchDeltaArr = this._generatePatchPermissionPatchDeltaArray(roleName, addPermissions, deletePermissions)
    if (patchDeltaArr.length > 0) {
      console.log('Patching permissions in Ory Keto....')
      await this.oryKetoWriteApi.patchRelationTuples(patchDeltaArr)
    }
  }

  _generatePatchPermissionPatchDeltaArray(role: string, addPermissions: string[], deletePermissions: string[]): PatchDelta[] {
    let patchDeltaArray: PatchDelta[] = []
    patchDeltaArray = patchDeltaArray.concat(addPermissions.map(permission => {
      return {
        action: 'insert',
        relation_tuple: this._generatePermissionTuple(role, permission)
      }
    }))
    patchDeltaArray = patchDeltaArray.concat(deletePermissions.map(permission => {
      return {
        action: 'delete',
        relation_tuple: this._generatePermissionTuple(role, permission)
      }
    }))
    return patchDeltaArray
  }

  _generatePermissionTuple(role: string, permission: string): InternalRelationTuple {
    return {
      namespace: 'permission',
      object: permission,
      relation: 'granted',
      subject: 'role:' + role + '#member'
    }
  }

}

export { KetoTuples };
