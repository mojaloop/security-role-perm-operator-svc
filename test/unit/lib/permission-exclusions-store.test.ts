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

import { PermissionExclusionResources } from '../../../src/lib/permission-exclusions-store'

describe('permission-exclusions-store', (): void => {
  describe('Add / Update permission exclusion resources', (): void => {
    var permissionExclusionResources: PermissionExclusionResources
    beforeAll(() => {
      permissionExclusionResources = new PermissionExclusionResources()
    })

    it('getData should be empty initially', (): void => {
      const data = permissionExclusionResources.getData()
      expect(data).toEqual({})
    })
    // Add Resources
    it('update a new resource', (): void => {
      permissionExclusionResources.updateResource('sampleResource1', '1', ['samplePermissionA1'], ['samplePermissionB1'])
      const data = permissionExclusionResources.getData()
      expect(data).toHaveProperty('sampleResource1')
      expect(data['sampleResource1']).toHaveProperty('permissionsA')
      expect(data['sampleResource1']).toHaveProperty('permissionsB')
      expect(Array.isArray(data['sampleResource1'].permissionsA))
      expect(data['sampleResource1'].permissionsA.length).toEqual(1)
      expect(data['sampleResource1'].permissionsA[0]).toEqual('samplePermissionA1')
      expect(Array.isArray(data['sampleResource1'].permissionsB))
      expect(data['sampleResource1'].permissionsB.length).toEqual(1)
      expect(data['sampleResource1'].permissionsB[0]).toEqual('samplePermissionB1')
    })
    it('getUniquePermissionExclusionCombos', (): void => {
      const data = permissionExclusionResources.getUniquePermissionExclusionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(2)
      expect(data).toContain('samplePermissionA1:samplePermissionB1')
      expect(data).toContain('samplePermissionB1:samplePermissionA1')
    })
    it('getConsolidatedTempData', (): void => {
      const tempData = permissionExclusionResources.getConsolidatedTempData('sampleResourceTemp', ['samplePermissionATemp'], ['samplePermissionBTemp'])
      expect(tempData).toHaveProperty('sampleResource1')
      expect(tempData).toHaveProperty('sampleResourceTemp')
    })
    it('update another new resource with two permissions', (): void => {
      permissionExclusionResources.updateResource('sampleResource2', '1', ['samplePermissionC1', 'samplePermissionC2'], ['samplePermissionD1', 'samplePermissionD2'])
      const data = permissionExclusionResources.getData()
      expect(data).toHaveProperty('sampleResource2')
      expect(data['sampleResource2']).toHaveProperty('permissionsA')
      expect(data['sampleResource2']).toHaveProperty('permissionsB')
      expect(Array.isArray(data['sampleResource2'].permissionsA))
      expect(data['sampleResource2'].permissionsA.length).toEqual(2)
      expect(data['sampleResource2'].permissionsA[0]).toEqual('samplePermissionC1')
      expect(data['sampleResource2'].permissionsA[1]).toEqual('samplePermissionC2')
      expect(Array.isArray(data['sampleResource2'].permissionsB))
      expect(data['sampleResource2'].permissionsB.length).toEqual(2)
      expect(data['sampleResource2'].permissionsB[0]).toEqual('samplePermissionD1')
      expect(data['sampleResource2'].permissionsB[1]).toEqual('samplePermissionD2')
    })
    it('getUniquePermissionExclusionCombos again', (): void => {
      const data = permissionExclusionResources.getUniquePermissionExclusionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(10)
      expect(data).toContain('samplePermissionA1:samplePermissionB1')
      expect(data).toContain('samplePermissionB1:samplePermissionA1')
      expect(data).toContain('samplePermissionC1:samplePermissionD1')
      expect(data).toContain('samplePermissionC1:samplePermissionD2')
      expect(data).toContain('samplePermissionC2:samplePermissionD1')
      expect(data).toContain('samplePermissionC2:samplePermissionD2')
      expect(data).toContain('samplePermissionD1:samplePermissionC1')
      expect(data).toContain('samplePermissionD1:samplePermissionC2')
      expect(data).toContain('samplePermissionD2:samplePermissionC1')
      expect(data).toContain('samplePermissionD2:samplePermissionC2')
    })
    it('update third resource with different permission setB', (): void => {
      permissionExclusionResources.updateResource('sampleResource3', '1', ['samplePermissionA1'], ['samplePermissionE1'])
      const data = permissionExclusionResources.getData()
      expect(data).toHaveProperty('sampleResource1')
      expect(data['sampleResource3']).toHaveProperty('permissionsA')
      expect(data['sampleResource3']).toHaveProperty('permissionsB')
      expect(Array.isArray(data['sampleResource3'].permissionsA))
      expect(data['sampleResource3'].permissionsA.length).toEqual(1)
      expect(data['sampleResource3'].permissionsA[0]).toEqual('samplePermissionA1')
      expect(Array.isArray(data['sampleResource3'].permissionsB))
      expect(data['sampleResource3'].permissionsB.length).toEqual(1)
      expect(data['sampleResource3'].permissionsB[0]).toEqual('samplePermissionE1')
    })
    it('getUniquePermissionExclusionCombos again', (): void => {
      const data = permissionExclusionResources.getUniquePermissionExclusionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(12)
      expect(data).toContain('samplePermissionA1:samplePermissionB1')
      expect(data).toContain('samplePermissionB1:samplePermissionA1')
      expect(data).toContain('samplePermissionC1:samplePermissionD1')
      expect(data).toContain('samplePermissionC1:samplePermissionD2')
      expect(data).toContain('samplePermissionC2:samplePermissionD1')
      expect(data).toContain('samplePermissionC2:samplePermissionD2')
      expect(data).toContain('samplePermissionD1:samplePermissionC1')
      expect(data).toContain('samplePermissionD1:samplePermissionC2')
      expect(data).toContain('samplePermissionD2:samplePermissionC1')
      expect(data).toContain('samplePermissionD2:samplePermissionC2')
      expect(data).toContain('samplePermissionA1:samplePermissionE1')
      expect(data).toContain('samplePermissionE1:samplePermissionA1')
    })
    // Delete Resources
    it('delete a resource', (): void => {
      permissionExclusionResources.deleteResource('sampleResource3')
      const data = permissionExclusionResources.getData()
      expect(data).not.toHaveProperty('sampleResource3')
    })
    it('getUniquePermissionExclusionCombos should not contain the deleted permissions', (): void => {
      const data = permissionExclusionResources.getUniquePermissionExclusionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(10)
      expect(data).not.toContain('samplePermissionA1:samplePermissionE1')
      expect(data).not.toContain('samplePermissionE1:samplePermissionA1')
    })
    it('delete another resource', (): void => {
      permissionExclusionResources.deleteResource('sampleResource1')
      const data = permissionExclusionResources.getData()
      expect(data).not.toHaveProperty('sampleResource1')
    })
    it('getUniquePermissionExclusionCombos should not contain the deleted permission', (): void => {
      const data = permissionExclusionResources.getUniquePermissionExclusionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(8)
      expect(data).not.toContain('samplePermissionA1:samplePermissionB1')
      expect(data).not.toContain('samplePermissionB1:samplePermissionA1')
    })
    it('update existing resource with same permission set A and different permission set B', (): void => {
      permissionExclusionResources.updateResource('sampleResource2', '2', ['samplePermissionC1', 'samplePermissionC2'], ['samplePermissionF1'])
      const data = permissionExclusionResources.getData()
      expect(data).toHaveProperty('sampleResource2')
      expect(data['sampleResource2']).toHaveProperty('permissionsA')
      expect(data['sampleResource2']).toHaveProperty('permissionsB')
      expect(Array.isArray(data['sampleResource2'].permissionsA))
      expect(data['sampleResource2'].permissionsA.length).toEqual(2)
      expect(data['sampleResource2'].permissionsA[0]).toEqual('samplePermissionC1')
      expect(data['sampleResource2'].permissionsA[1]).toEqual('samplePermissionC2')
      expect(Array.isArray(data['sampleResource2'].permissionsB))
      expect(data['sampleResource2'].permissionsB.length).toEqual(1)
      expect(data['sampleResource2'].permissionsB[0]).toEqual('samplePermissionF1')
    })
    it('getUniquePermissionExclusionCombos should contain the updated combos', (): void => {
      const data = permissionExclusionResources.getUniquePermissionExclusionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(4)
      expect(data).not.toContain('samplePermissionC1:samplePermissionD1')
      expect(data).not.toContain('samplePermissionC1:samplePermissionD2')
      expect(data).not.toContain('samplePermissionC2:samplePermissionD1')
      expect(data).not.toContain('samplePermissionC2:samplePermissionD2')
      expect(data).not.toContain('samplePermissionD1:samplePermissionC1')
      expect(data).not.toContain('samplePermissionD1:samplePermissionC2')
      expect(data).not.toContain('samplePermissionD2:samplePermissionC1')
      expect(data).not.toContain('samplePermissionD2:samplePermissionC2')
      expect(data).toContain('samplePermissionC1:samplePermissionF1')
      expect(data).toContain('samplePermissionC2:samplePermissionF1')
      expect(data).toContain('samplePermissionF1:samplePermissionC1')
      expect(data).toContain('samplePermissionF1:samplePermissionC2')
    })
    // Negative scenarios
    it('delete non-existant resource', (): void => {
      expect(() => permissionExclusionResources.deleteResource('sampleResource4')).not.toThrow()
    })
  })
})
