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
/* eslint-disable import/first */

// Mock functions for jest. Keep these functions at the top because jest.mock calls will be hoisted to below these lines
const mockAddToQueue = jest.fn()

// Mock K8s client-node library
import * as k8s from '@kubernetes/client-node'
import { PermissionExclusionResources } from '../../src/lib/permission-exclusions-store'
import { startOperator } from '../../src/permission-exclusions-operator'
import { PermissionExclusionsValidator, UserRole, RolePermissions, PermissionExclusions } from '../../src/validation/permission-exclusions'

jest.mock('../../src/lib/permission-exclusions-store')
jest.mock('../../src/validation/permission-exclusions')
jest.mock('@kubernetes/client-node')

const k8sWatchInstance = (<any>k8s.Watch).mock.instances[0]

// PermissionExclusionResources
const permissionExclusionResourceStoreObject = (<any>PermissionExclusionResources).mock.instances[0];
(permissionExclusionResourceStoreObject.getConsolidatedTempData as jest.Mock).mockReturnValue({
  pe1: {
    permissionsA: [
      'PERM1'
    ],
    permissionsB: [
      'PERM2'
    ]
  }
})

jest.mock('../../src/lib/keto-change-processor', () => {
  return {
    getInstance: jest.fn().mockImplementation(() => {
      return {
        addToQueue: mockAddToQueue,
        waitForQueueToBeProcessed: jest.fn()
      }
    })
  }
})

const sampleApiObj = {
  metadata: {
    name: 'sampleResource1',
    generation: 1
  },
  spec: {
    permissionsA: [
      'samplePermissionA1'
    ],
    permissionsB: [
      'samplePermissionB1'
    ]
  }
}

const wrongApiObjWithoutPermissionsB = {
  metadata: {
    name: 'sampleResource1',
    generation: 1
  },
  spec: {
    permissionsA: [
      'samplePermissionA1'
    ]
  }
}

const wrongApiObjWithoutPermissionsA = {
  metadata: {
    name: 'sampleResource1',
    generation: 1
  },
  spec: {
    permissionsB: [
      'samplePermissionB1'
    ]
  }
}

const wrongApiObjWithoutMetadata = {
  spec: {
    permissionsA: [
      'samplePermissionA1'
    ],
    permissionsB: [
      'samplePermissionB1'
    ]
  }
}

const wrongApiObjWithoutResourceName = {
  metadata: {},
  spec: {
    permissionsA: [
      'samplePermissionA1'
    ],
    permissionsB: [
      'samplePermissionB1'
    ]
  }
}

const createWatchEventImplementation = (phase: string, apiObj: any) => {
  return async (_path: string, _queryParams: any, eventCallback: jest.Mock, _doneCallback: jest.Mock) => {
    await eventCallback(phase, apiObj)
  }
}

const createWatchDoneImplementation = (error: string) => {
  return (_path: string, _queryParams: any, _eventCallback: jest.Mock, doneCallback: jest.Mock) => {
    doneCallback(error)
  }
}

describe('Permission Exclusion operator', (): void => {
  let spyUpdateResource: jest.Mock
  let spyDeleteResource: jest.Mock
  let spyAddToQueue: jest.Mock
  let spyWatch: jest.Mock
  let peValidatorInstance: any
  beforeAll(() => {
    spyUpdateResource = (permissionExclusionResourceStoreObject.updateResource as jest.Mock)
    spyDeleteResource = (permissionExclusionResourceStoreObject.deleteResource as jest.Mock)
    peValidatorInstance = (PermissionExclusionsValidator as jest.Mock).mock.instances[0]
    spyAddToQueue = mockAddToQueue
    spyWatch = k8sWatchInstance.watch
  })
  describe('Positive Scenarios', (): void => {
    afterEach(() => {
      spyUpdateResource.mockClear()
      spyDeleteResource.mockClear()
      spyAddToQueue.mockClear()
      spyWatch.mockClear()
    })
    it('startOperator should call the function watch', async () => {
      await startOperator()
      expect(spyWatch).toHaveBeenCalledTimes(1)
    })
    it('ADDED phase event', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', sampleApiObj))
      await startOperator()
      expect(spyWatch).toHaveBeenCalledTimes(1)
      expect(spyUpdateResource).toHaveBeenCalledWith('sampleResource1', '1', ['samplePermissionA1'], ['samplePermissionB1'])
      expect(spyAddToQueue).toHaveBeenCalledTimes(1)
    })
    it('MODIFIED phase event', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('MODIFIED', sampleApiObj))
      await startOperator()
      expect(spyWatch).toHaveBeenCalledTimes(1)
      expect(spyUpdateResource).toHaveBeenCalledWith('sampleResource1', '1', ['samplePermissionA1'], ['samplePermissionB1'])
      expect(spyAddToQueue).toHaveBeenCalledTimes(1)
    })
    it('DELETED phase event', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('DELETED', sampleApiObj))
      await startOperator()
      expect(spyWatch).toHaveBeenCalledTimes(1)
      expect(spyDeleteResource).toHaveBeenCalledWith('sampleResource1')
      expect(spyAddToQueue).toHaveBeenCalledTimes(1)
    })
    it('Done callback from watch should start the loop again', async () => {
      spyWatch.mockImplementation(createWatchDoneImplementation('Some Error'))
      await startOperator()
      expect(spyWatch).toHaveBeenCalledTimes(1)
    })
  })
  describe('Negative Scenarios', (): void => {
    beforeAll(() => {
      spyUpdateResource.mockReset()
      spyDeleteResource.mockReset()
      spyAddToQueue.mockReset()
      spyWatch.mockReset()
    })
    afterEach(() => {
      spyUpdateResource.mockClear()
      spyDeleteResource.mockClear()
      spyAddToQueue.mockClear()
      spyWatch.mockClear()
    })
    it('startOperator should catch the standard error from K8S', async () => {
      spyWatch.mockRejectedValue(new Error('No currently active cluster'))
      await expect(startOperator).not.toThrowError()
      expect(spyWatch).toHaveBeenCalledTimes(1)
    })
    it('startOperator should catch the error thrown by K8S watch', async () => {
      spyWatch.mockRejectedValue(new Error('Some K8S watch error'))
      await expect(startOperator).not.toThrowError()
      expect(spyWatch).toHaveBeenCalledTimes(1)
    })
    it('startOperator should catch the error thrown by K8S watch', async () => {
      (peValidatorInstance.validatePermissionExclusions as jest.Mock).mockRejectedValue(new Error('Some error'))
      await expect(startOperator).not.toThrowError()
      expect(spyWatch).toHaveBeenCalledTimes(1)
    })
    it('Unknown phase event', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('SOMEEVENT', sampleApiObj))
      await startOperator()
      expect(spyUpdateResource).not.toHaveBeenCalled()
      expect(spyDeleteResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event with wrong api object 1', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', wrongApiObjWithoutMetadata))
      await startOperator()
      expect(spyUpdateResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event with wrong api object 2', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', wrongApiObjWithoutResourceName))
      await startOperator()
      expect(spyUpdateResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event with wrong api object 3', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', wrongApiObjWithoutPermissionsA))
      await startOperator()
      expect(spyUpdateResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event with wrong api object 4', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', wrongApiObjWithoutPermissionsB))
      await startOperator()
      expect(spyUpdateResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event without api object', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', null))
      await startOperator()
      expect(spyUpdateResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
  })
})
