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

import { RoleResources } from '../../../src/lib/role-resources'

describe('role-resources', (): void => {
  describe('Add / Update role resources', (): void => {
    let roleResourceStore: RoleResources
    beforeAll(() => {
      roleResourceStore = new RoleResources()
    })

    it('getData should be empty initially', (): void => {
      const data = roleResourceStore.getData()
      expect(data).toEqual({})
    })
    // Add Resources
    it('update a new role resource', (): void => {
      roleResourceStore.updateRoleResource('sampleResource1', '1', 'sampleRole1', ['samplePermission1'])
      const data = roleResourceStore.getData()
      expect(data).toHaveProperty('sampleResource1')
      expect(data.sampleResource1).toHaveProperty('role')
      expect(data.sampleResource1).toHaveProperty('permissions')
      expect(data.sampleResource1.role).toEqual('sampleRole1')
      expect(Array.isArray(data.sampleResource1.permissions))
      expect(data.sampleResource1.permissions?.length).toEqual(1)
      expect(data.sampleResource1.permissions?.[0]).toEqual('samplePermission1')
    })
    it('getUniqueRolePermissionCombos', (): void => {
      const data = roleResourceStore.getUniqueRolePermissionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(1)
      expect(data[0]).toEqual('sampleRole1:samplePermission1')
    })
    it('getConsolidatedTempData', (): void => {
      const tempData = roleResourceStore.getConsolidatedTempData('sampleResourceTemp', 'sampleRoleTemp', ['samplePermissionTemp'])
      expect(tempData).toHaveProperty('sampleResource1')
      expect(tempData).toHaveProperty('sampleResourceTemp')
    })
    it('update another new role resource with two permissions', (): void => {
      roleResourceStore.updateRoleResource('sampleResource2', '1', 'sampleRole2', ['samplePermission1', 'samplePermission2'])
      const data = roleResourceStore.getData()
      expect(data).toHaveProperty('sampleResource2')
      expect(data.sampleResource2).toHaveProperty('role')
      expect(data.sampleResource2).toHaveProperty('permissions')
      expect(data.sampleResource2.role).toEqual('sampleRole2')
      expect(Array.isArray(data.sampleResource2.permissions))
      expect(data.sampleResource2.permissions?.length).toEqual(2)
      expect(data.sampleResource2.permissions).toContain('samplePermission1')
      expect(data.sampleResource2.permissions).toContain('samplePermission2')
    })
    it('getUniqueRolePermissionCombos again', (): void => {
      const data = roleResourceStore.getUniqueRolePermissionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(3)
      expect(data).toContain('sampleRole1:samplePermission1')
      expect(data).toContain('sampleRole2:samplePermission1')
      expect(data).toContain('sampleRole2:samplePermission2')
    })
    it('update third resource with same role and different permissions', (): void => {
      roleResourceStore.updateRoleResource('sampleResource3', '1', 'sampleRole2', ['samplePermission2', 'samplePermission3'])
      const data = roleResourceStore.getData()
      expect(data).toHaveProperty('sampleResource3')
      expect(data.sampleResource3).toHaveProperty('role')
      expect(data.sampleResource3).toHaveProperty('permissions')
      expect(data.sampleResource3.role).toEqual('sampleRole2')
      expect(Array.isArray(data.sampleResource3.permissions))
      expect(data.sampleResource3.permissions?.length).toEqual(2)
      expect(data.sampleResource3.permissions).toContain('samplePermission2')
      expect(data.sampleResource3.permissions).toContain('samplePermission3')
    })
    it('getUniqueRolePermissionCombos should contain the combined unique combos', (): void => {
      const data = roleResourceStore.getUniqueRolePermissionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(4)
      expect(data).toContain('sampleRole1:samplePermission1')
      expect(data).toContain('sampleRole2:samplePermission1')
      expect(data).toContain('sampleRole2:samplePermission2')
      expect(data).toContain('sampleRole2:samplePermission3')
    })
    // Delete Resources
    it('delete a resource', (): void => {
      roleResourceStore.deleteRoleResource('sampleResource3')
      const data = roleResourceStore.getData()
      expect(data).not.toHaveProperty('sampleResource3')
    })
    it('getUniqueRolePermissionCombos should not contain the deleted permission', (): void => {
      const data = roleResourceStore.getUniqueRolePermissionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(3)
      expect(data).not.toContain('sampleRole2:samplePermission3')
    })
    it('delete another resource', (): void => {
      roleResourceStore.deleteRoleResource('sampleResource1')
      const data = roleResourceStore.getData()
      expect(data).not.toHaveProperty('sampleResource1')
    })
    it('getUniqueRolePermissionCombos should not contain the deleted permission', (): void => {
      const data = roleResourceStore.getUniqueRolePermissionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(2)
      expect(data).not.toContain('sampleRole1:samplePermission1')
    })
    it('update existing resource with same role and different permissions', (): void => {
      roleResourceStore.updateRoleResource('sampleResource2', '2', 'sampleRole2', ['samplePermission4', 'samplePermission5'])
      const data = roleResourceStore.getData()
      expect(data).toHaveProperty('sampleResource2')
      expect(data.sampleResource2).toHaveProperty('role')
      expect(data.sampleResource2).toHaveProperty('permissions')
      expect(data.sampleResource2.role).toEqual('sampleRole2')
      expect(Array.isArray(data.sampleResource2.permissions))
      expect(data.sampleResource2.permissions?.length).toEqual(2)
      expect(data.sampleResource2.permissions).toContain('samplePermission4')
      expect(data.sampleResource2.permissions).toContain('samplePermission5')
    })
    it('getUniqueRolePermissionCombos should contain the updated combos', (): void => {
      const data = roleResourceStore.getUniqueRolePermissionCombos()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toEqual(2)
      expect(data).toContain('sampleRole2:samplePermission4')
      expect(data).toContain('sampleRole2:samplePermission5')
    })
    // Negative scenarios
    it('delete non-existant resource', (): void => {
      expect(() => roleResourceStore.deleteRoleResource('sampleResource4')).not.toThrow()
    })
  })
})
