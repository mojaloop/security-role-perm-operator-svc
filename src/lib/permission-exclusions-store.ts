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
  role: string;
  permissions: string[];
}

class PermissionExclusionResources {
  permissionExclusionResourceData: any;

  constructor () {
    this.permissionExclusionResourceData = {}
  }

  _checkResource (resourceName: string) : void {
    if (!this.permissionExclusionResourceData[resourceName]) {
      this.permissionExclusionResourceData[resourceName] = {}
    }
    if (!this.permissionExclusionResourceData[resourceName].permissionsA) {
      this.permissionExclusionResourceData[resourceName].permissionsA = []
    }
    if (!this.permissionExclusionResourceData[resourceName].permissionsB) {
      this.permissionExclusionResourceData[resourceName].permissionsB = []
    }
  }

  updateResource (resourceName: string, hash: string, permissionsA: string[], permissionsB: string[]) : void {
    this._checkResource(resourceName)
    this.permissionExclusionResourceData[resourceName].permissionsA = permissionsA
    this.permissionExclusionResourceData[resourceName].permissionsB = permissionsB
    this.permissionExclusionResourceData[resourceName].hash = hash
  }

  checkHash (resourceName: string, hash: string) : boolean {
    // eslint-disable-next-line max-len
    if (this.permissionExclusionResourceData[resourceName] && this.permissionExclusionResourceData[resourceName].hash === hash) {
      return true
    } else {
      return false
    }
  }

  deleteResource (resourceName: string) : void {
    if (this.permissionExclusionResourceData[resourceName]) {
      delete this.permissionExclusionResourceData[resourceName]
    }
  }

  getData () : any {
    return this.permissionExclusionResourceData
  }

  getConsolidatedTempData (resourceName: string, permissionsA: string[], permissionsB: string[]) : any {
    // Create a deep clone of existing data
    const tempPermissionExclusionResourceData = JSON.parse(JSON.stringify(this.permissionExclusionResourceData))
    if (!tempPermissionExclusionResourceData[resourceName]) {
      tempPermissionExclusionResourceData[resourceName] = {}
    }
    if (!tempPermissionExclusionResourceData[resourceName].permissionsA) {
      tempPermissionExclusionResourceData[resourceName].permissionsA = []
    }
    if (!tempPermissionExclusionResourceData[resourceName].permissionsB) {
      tempPermissionExclusionResourceData[resourceName].permissionsB = []
    }
    tempPermissionExclusionResourceData[resourceName].permissionsA = permissionsA
    tempPermissionExclusionResourceData[resourceName].permissionsB = permissionsB
    return tempPermissionExclusionResourceData
  }

  getUniquePermissionExclusionCombos () : string[] {
    const permissionCombos: string[] = []
    for (const [, value] of Object.entries(this.permissionExclusionResourceData)) {
      const resourceObj = <any>value
      const permissionsA = resourceObj.permissionsA
      const permissionsB = resourceObj.permissionsB
      for (const permA of permissionsA) {
        for (const permB of permissionsB) {
          const permissionCombo = permA + ':' + permB
          if (!permissionCombos.includes(permissionCombo)) {
            permissionCombos.push(permissionCombo)
          }
          // Exclude vice versa
          const permissionComboRev = permB + ':' + permA
          if (!permissionCombos.includes(permissionComboRev)) {
            permissionCombos.push(permissionComboRev)
          }
        }
      }
    }
    return permissionCombos
  }
}

export { PermissionExclusionResources }
