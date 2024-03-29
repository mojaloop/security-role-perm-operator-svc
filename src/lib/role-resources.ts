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

export interface RolePermissionModel {
  role?: string | null;
  permissions?: string[];
  hash?: string;
}

export type RolePermissionModelMap = Record<string, RolePermissionModel>

class RoleResources {
  roleResourceData: RolePermissionModelMap

  constructor () {
    this.roleResourceData = {}
  }

  _checkResource (resourceName: string) : void {
    if (!this.roleResourceData[resourceName]) {
      this.roleResourceData[resourceName] = {}
    }
    if (!this.roleResourceData[resourceName].role) {
      this.roleResourceData[resourceName].role = null
    }
    if (!this.roleResourceData[resourceName].permissions) {
      this.roleResourceData[resourceName].permissions = []
    }
  }

  updateRoleResource (resourceName: string, hash: string, role: string, permissions: string[]) : void {
    this._checkResource(resourceName)
    this.roleResourceData[resourceName].role = role
    this.roleResourceData[resourceName].permissions = permissions
    this.roleResourceData[resourceName].hash = hash
  }

  checkHash (resourceName: string, hash: string) : boolean {
    /* istanbul ignore next */
    return this.roleResourceData[resourceName]?.hash === hash
  }

  deleteRoleResource (resourceName: string) : void {
    if (this.roleResourceData[resourceName]) {
      delete this.roleResourceData[resourceName]
    }
  }

  getData (): RolePermissionModelMap {
    return this.roleResourceData
  }

  getConsolidatedTempData (resourceName: string, role: string, permissions: string[]) : any {
    // Create a deep clone of existing data
    const tempRoleResourceData = JSON.parse(JSON.stringify(this.roleResourceData))
    if (!tempRoleResourceData[resourceName]) {
      tempRoleResourceData[resourceName] = {}
    }
    tempRoleResourceData[resourceName].role = role
    tempRoleResourceData[resourceName].permissions = permissions
    return tempRoleResourceData
  }

  getUniqueRolePermissionCombos () : string[] {
    const rolePermissionCombos: string[] = []
    for (const [, resourceObj] of Object.entries(this.roleResourceData)) {
      const role = resourceObj.role
      const permissions = resourceObj.permissions || []

      for (const permission of permissions) {
        const rolePermissionCombo = role + ':' + permission
        if (!rolePermissionCombos.includes(rolePermissionCombo)) {
          rolePermissionCombos.push(rolePermissionCombo)
        }
      }
    }
    return rolePermissionCombos
  }
}

export { RoleResources }
