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

// eslint-disable-next-line max-len
import { startOperator, getRoleResourceStore, getRolePermissionChangeProcessor, getWatch } from '../../src/role-permission-operator'
// import { RoleResources } from "./lib/role-resources"

jest.mock('@kubernetes/client-node');
jest.mock('../../src/lib/role-resources');
jest.mock('../../src/lib/keto-change-processor');

// (KetoTuples as jest.Mock).mockImplementation(() => {
//   return {
//     updateAllRolePermissions: jest.fn()
//   }
// })

const sampleApiObj = {
  metadata: {
    name: 'sampleResource1'
  },
  spec: {
    role: 'sampoleRole1',
    permissions: [
      'samplePermission1'
    ]
  }
}

const wrongApiObjWithoutPermissions = {
  metadata: {
    name: 'sampleResource1'
  },
  spec: {
    role: 'sampoleRole1'
  }
}

const wrongApiObjWithoutRole = {
  metadata: {
    name: 'sampleResource1'
  },
  spec: {
    permissions: [
      'samplePermission1'
    ]
  }
}

const wrongApiObjWithoutMetadata = {
  spec: {
    role: 'sampoleRole1',
    permissions: [
      'samplePermission1'
    ]
  }
}

const wrongApiObjWithoutResourceName = {
  metadata: {},
  spec: {
    role: 'sampoleRole1',
    permissions: [
      'samplePermission1'
    ]
  }
}

const createWatchEventImplementation = (phase: string, apiObj: any) => {
  return (_path: string, _queryParams: any, eventCallback: jest.Mock, _doneCallback: jest.Mock) => {
    eventCallback(phase, apiObj)
  }
}

const createWatchDoneImplementation = (error: string) => {
  return (_path: string, _queryParams: any, _eventCallback: jest.Mock, doneCallback: jest.Mock) => {
    doneCallback(error)
  }
}

describe('Role Permission operator', (): void => {
  let spyUpdateRoleResource: jest.Mock
  let spyDeleteRoleResource: jest.Mock
  let spyAddToQueue: jest.Mock
  let spyWatch: jest.Mock
  beforeAll(() => {
    spyUpdateRoleResource = (getRoleResourceStore().updateRoleResource as jest.Mock)
    spyDeleteRoleResource = (getRoleResourceStore().deleteRoleResource as jest.Mock)
    spyAddToQueue = (getRolePermissionChangeProcessor().addToQueue as jest.Mock)
    spyWatch = (getWatch().watch as jest.Mock)
  })
  describe('Positive Scenarios', (): void => {
    afterEach(() => {
      spyUpdateRoleResource.mockClear()
      spyDeleteRoleResource.mockClear()
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
      expect(spyUpdateRoleResource).toHaveBeenCalledWith('sampleResource1', 'sampoleRole1', ['samplePermission1'])
      expect(spyAddToQueue).toHaveBeenCalledTimes(1)
    })
    it('MODIFIED phase event', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('MODIFIED', sampleApiObj))
      await startOperator()
      expect(spyWatch).toHaveBeenCalledTimes(1)
      expect(spyUpdateRoleResource).toHaveBeenCalledWith('sampleResource1', 'sampoleRole1', ['samplePermission1'])
      expect(spyAddToQueue).toHaveBeenCalledTimes(1)
    })
    it('DELETED phase event', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('DELETED', sampleApiObj))
      await startOperator()
      expect(spyWatch).toHaveBeenCalledTimes(1)
      expect(spyDeleteRoleResource).toHaveBeenCalledWith('sampleResource1')
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
      spyUpdateRoleResource.mockReset()
      spyDeleteRoleResource.mockReset()
      spyAddToQueue.mockReset()
      spyWatch.mockReset()
    })
    afterEach(() => {
      spyUpdateRoleResource.mockClear()
      spyDeleteRoleResource.mockClear()
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
    it('Unknown phase event', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('SOMEEVENT', sampleApiObj))
      await startOperator()
      expect(spyUpdateRoleResource).not.toHaveBeenCalled()
      expect(spyDeleteRoleResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event with wrong api object 1', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', wrongApiObjWithoutMetadata))
      await startOperator()
      expect(spyUpdateRoleResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event with wrong api object 2', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', wrongApiObjWithoutResourceName))
      await startOperator()
      expect(spyUpdateRoleResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event with wrong api object 3', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', wrongApiObjWithoutRole))
      await startOperator()
      expect(spyUpdateRoleResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event with wrong api object 4', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', wrongApiObjWithoutPermissions))
      await startOperator()
      expect(spyUpdateRoleResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
    it('Event without api object', async () => {
      spyWatch.mockImplementation(createWatchEventImplementation('ADDED', null))
      await startOperator()
      expect(spyUpdateRoleResource).not.toHaveBeenCalled()
      expect(spyAddToQueue).not.toHaveBeenCalled()
    })
  })
  // describe('onEvent', (): void => {
  //   // let rolePermissionChangeProcessor: RolePermissionChangeProcessor
  //   // let spyUpdateAllRolePermissions: jest.Mock

  //   it('onEvent should call updateRoleResource on ADDED phase event', async () => {
  //     await k8sOperator.onEvent('ADDED', sampleApiObj)
  //     expect(spyUpdateRoleResource).toHaveBeenCalled()
  //   })
  // })
})
