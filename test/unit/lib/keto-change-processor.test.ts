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

import KetoChangeProcessor from '../../../src/lib/keto-change-processor'
import Config from '../../../src/shared/config'

describe('role-permission-change-processor', (): void => {
  describe('KetoChangeProcessor Add Queue', (): void => {
    let ketoChangeProcessor: KetoChangeProcessor
    let spyUpdateAllRolePermissions: jest.Mock

    beforeAll(() => {
      spyUpdateAllRolePermissions = jest.fn()
    })

    it('Initialize ketoChangeProcessor', async () => {
      jest.useFakeTimers()
      ketoChangeProcessor = KetoChangeProcessor.getInstance()
      expect(ketoChangeProcessor).toHaveProperty('addToQueue')
      expect(ketoChangeProcessor).toHaveProperty('getQueue')
    })
    it('getQueue should return empty array initially', async () => {
      const currentQueue = ketoChangeProcessor.getQueue()
      expect(Array.isArray(currentQueue)).toBe(true)
      expect(currentQueue.length).toEqual(0)
    })
    it('addToQueue: queue the first role permission combo', async () => {
      const rolePermissionCombos = [
        'sampleRole1:samplePermission1'
      ]
      ketoChangeProcessor.addToQueue(rolePermissionCombos, spyUpdateAllRolePermissions)
      const currentQueue = ketoChangeProcessor.getQueue()
      expect(currentQueue.length).toEqual(1)
    })
    it('queued item should be processed after some time', async () => {
      spyUpdateAllRolePermissions.mockClear()
      jest.advanceTimersByTime(Config.KETO_QUEUE_PROCESS_INTERVAL_MS)
      const currentQueue = ketoChangeProcessor.getQueue()
      // expect(currentQueue.length).toEqual(0)
      expect(spyUpdateAllRolePermissions).toHaveBeenCalled()
    })
    it('empty queue should not throw an error', async () => {
      jest.advanceTimersByTime(Config.KETO_QUEUE_PROCESS_INTERVAL_MS)
      const currentQueue = ketoChangeProcessor.getQueue()
      expect(currentQueue.length).toEqual(0)
    })

    // Negative scenarios
    it('addToQueue: queue the second role permission combo', async () => {
      const rolePermissionCombos = [
        'sampleRole2:samplePermission2'
      ]
      ketoChangeProcessor.addToQueue(rolePermissionCombos, spyUpdateAllRolePermissions)
      const currentQueue = ketoChangeProcessor.getQueue()
      expect(currentQueue.length).toEqual(1)
    })
    it('queued item should be processed and throw an error this time', async () => {
      spyUpdateAllRolePermissions.mockClear()
      spyUpdateAllRolePermissions.mockRejectedValue(
        new Error('Some Error')
      )
      jest.advanceTimersByTime(Config.KETO_QUEUE_PROCESS_INTERVAL_MS)
      const currentQueue = ketoChangeProcessor.getQueue()
      expect(currentQueue.length).toEqual(1)
      expect(spyUpdateAllRolePermissions).toHaveBeenCalled()
    })
    it('stop processing', async () => {
      ketoChangeProcessor.destroy()
      jest.useRealTimers()
    })
  })
})
