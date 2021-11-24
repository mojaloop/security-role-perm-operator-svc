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

import { KetoTuples } from '../../../src/lib/role-permission-keto-tuples'

jest.mock('@ory/keto-client')

const sampleRelationTupleData = {
  relation_tuples: [
    {
      namespace: 'permission',
      object: 'samplePermission1',
      relation: 'granted',
      subject: 'role:sampleRole1#member'
    }
  ]
}

// const mockLoggerError = jest.spyOn(Logger, 'error')

describe('role-resources', (): void => {
  describe('Keto update tuples', (): void => {
    let oryKeto: KetoTuples
    let spyGetRelationTuples: jest.Mock
    let spyPatchRelationTuples: jest.Mock
    beforeAll(() => {
      oryKeto = new KetoTuples();
      spyGetRelationTuples = oryKeto.oryKetoReadApi.getRelationTuples as jest.Mock
      spyPatchRelationTuples = oryKeto.oryKetoWriteApi.patchRelationTuples as jest.Mock
      spyGetRelationTuples.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        config: {},
        headers: {},
        data: sampleRelationTupleData
      })
    })

    afterEach((): void => {
      spyPatchRelationTuples.mockReset()
    })

    it('getAllRolePermissionCombos', async () => {
      const rolePermissionCombos = await oryKeto.getAllRolePermissionCombos();
      expect(Array.isArray(rolePermissionCombos)).toBe(true)
      expect(rolePermissionCombos.length).toEqual(1)
      expect(rolePermissionCombos[0]).toEqual('sampleRole1:samplePermission1')
    })
    it('updateAllRolePermissions', async () => {
      const newRolePermissionCombos = [
        'sampleRole2:samplePermission2'
      ]
      await oryKeto.updateAllRolePermissions(newRolePermissionCombos);
      expect(spyPatchRelationTuples).toHaveBeenCalledWith(expect.arrayContaining([
        {
          action: 'delete',
          relation_tuple: expect.objectContaining({ object: 'samplePermission1'})
        },
        {
          action: 'insert',
          relation_tuple: expect.objectContaining({ object: 'samplePermission2'})
        }
      ]))
    })
    it('updateAllRolePermissions with empty array', async () => {
      const newRolePermissionCombos: any[] = []
      await oryKeto.updateAllRolePermissions(newRolePermissionCombos);
      expect(spyPatchRelationTuples).toHaveBeenCalledWith(expect.arrayContaining([
        {
          action: 'delete',
          relation_tuple: expect.objectContaining({ object: 'samplePermission1'})
        }
      ]))
    })
    it('updateAllRolePermissions with same rolePermissions', async () => {
      const newRolePermissionCombos = [
        'sampleRole1:samplePermission1'
      ]
      await oryKeto.updateAllRolePermissions(newRolePermissionCombos);
      expect(spyPatchRelationTuples).not.toHaveBeenCalled()
    })
    // Negative scenarios
    it('getAllRolePermissionCombos', async () => {
      const spyGetRelationTuples = oryKeto.oryKetoReadApi.getRelationTuples as jest.Mock
      spyGetRelationTuples.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        config: {},
        headers: {},
        data: {
          relation_tuples: []
        }
      })
      const rolePermissionCombos = await oryKeto.getAllRolePermissionCombos();
      expect(Array.isArray(rolePermissionCombos)).toBe(true)
      expect(rolePermissionCombos.length).toEqual(0)
    })
    it('updateAllRolePermissions if the data from keto getTuples call is null', async () => {
      spyGetRelationTuples.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        config: {},
        headers: {},
        data: null
      })
      const newRolePermissionCombos = [
        'sampleRole2:samplePermission2'
      ]
      await oryKeto.updateAllRolePermissions(newRolePermissionCombos);
      expect(spyPatchRelationTuples).toHaveBeenCalledWith(expect.arrayContaining([
        {
          action: 'insert',
          relation_tuple: expect.objectContaining({ object: 'samplePermission2'})
        }
      ]))
    })
  })
})
