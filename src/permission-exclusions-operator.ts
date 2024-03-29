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

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as k8s from '@kubernetes/client-node'
import { logger } from './shared/logger'
import Config from './shared/config'
import { PermissionExclusionResources } from './lib/permission-exclusions-store'
import { PermissionExclusions, PermissionExclusionsValidator } from './validation/permission-exclusions'
import KetoChangeProcessor from './lib/keto-change-processor'
import { KetoTuples } from './lib/permission-exclusions-keto-tuples'
import { ValidationError } from './validation/validation-error'

const permissionExclusionsValidator = new PermissionExclusionsValidator(Config)
// Configure the operator to monitor your custom resources
// and the namespace for your custom resources
const RESOURCE_GROUP = Config.PERMISSION_EXCLUSIONS_OPERATOR.WATCH_RESOURCE_GROUP
const RESOURCE_VERSION = Config.PERMISSION_EXCLUSIONS_OPERATOR.WATCH_RESOURCE_VERSION
const RESOURCE_PLURAL = Config.PERMISSION_EXCLUSIONS_OPERATOR.WATCH_RESOURCE_PLURAL
const NAMESPACE = Config.WATCH_NAMESPACE

const permissionExclusionResourceStore = new PermissionExclusionResources()
const oryKeto = new KetoTuples()
const ketoChangeProcessor = KetoChangeProcessor.getInstance()
const updateKetoFn = async (fnArgs: any) => {
  const boundedFn = oryKeto.updateAllPermissionExclusions.bind(oryKeto)
  boundedFn(fnArgs.subjectObjectCombos)
  logger.info('Updated the relation tuples in Keto', fnArgs.subjectObjectCombos)
}
const kc = new k8s.KubeConfig()
kc.loadFromDefault()

let healthStatus = 'Unknown'

// If we want to do something in K8S, we can use the following APIs
// const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
// const k8sApiMC = kc.makeApiClient(k8s.CustomObjectsApi);
// const k8sApiPods = kc.makeApiClient(k8s.CoreV1Api);
const k8sApiCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi)
// Listen for events or notifications and act accordingly
const watch = new k8s.Watch(kc)

async function onEvent (phase: string, apiObj: any) {
  logger.info(`Received event in phase ${phase} for the resource ${apiObj?.metadata?.name}`)
  const resourceName = apiObj?.metadata?.name
  const generation = apiObj?.metadata?.generation + ''
  const permissionsA = apiObj?.spec?.permissionsA
  const permissionsB = apiObj?.spec?.permissionsB
  // Ignore status updates by comparing generation number
  if (phase === 'MODIFIED' && permissionExclusionResourceStore.checkHash(resourceName, generation)) {
    return
  }

  if (resourceName && permissionsA && permissionsB) {
    ketoChangeProcessor.queue.add(async () => {
      if (phase === 'ADDED' || phase === 'MODIFIED') {
        // Get the temporary consolidated permissions based on already stored permissions
        const consolidatedPermissionExclusions = permissionExclusionResourceStore.getConsolidatedTempData(resourceName, permissionsA, permissionsB)
        const permissionExclusions: PermissionExclusions[] = Object.entries(consolidatedPermissionExclusions).map(item => {
          return {
            permissionsA: (<any>item[1]).permissionsA,
            permissionsB: (<any>item[1]).permissionsB
          }
        })

        // Validate the resultant calculated permission exclusions with role permission assignments and user role mappings
        try {
          await permissionExclusionsValidator.validatePermissionExclusions(permissionExclusions)
          permissionExclusionResourceStore.updateResource(resourceName, generation, permissionsA, permissionsB)
          // Set the status of our resource
          await _updateResourceStatus(apiObj, 'VALIDATED')
        } catch (err) {
          logger.error(`Validation failed for the permission exclusion resource: ${resourceName}`)
          if (err instanceof ValidationError) {
            logger.error(JSON.stringify(err.validationErrors))
            await _updateResourceStatus(apiObj, 'VALIDATION FAILED', err.validationErrors)
          } else {
            await _updateResourceStatus(apiObj, 'UNKNOWN ERROR')
          }
          return
        }
      } else if (phase === 'DELETED') {
        permissionExclusionResourceStore.deleteResource(resourceName)
      } else {
        logger.warn(`Unknown event type: ${phase}`)
        return
      }
      const permissionExclusionCombos = permissionExclusionResourceStore.getUniquePermissionExclusionCombos()

      logger.info('Current permission exclusions in memory' + JSON.stringify(permissionExclusionCombos))
      const queueArgs = {
        subjectObjectCombos: permissionExclusionCombos
      }
      await updateKetoFn(queueArgs)
    })
  }
}

async function _updateResourceStatus (apiObj: any, statusText: string, errors?: string[]) : Promise<void> {
  const status: any = {
    apiVersion: apiObj.apiVersion,
    kind: apiObj.kind,
    metadata: {
      name: apiObj.metadata.name!,
      resourceVersion: apiObj.metadata.resourceVersion
    },
    status: {
      state: statusText,
      errors: errors
    }
  }

  try {
    k8sApiCustomObjects.replaceNamespacedCustomObjectStatus(
      RESOURCE_GROUP,
      RESOURCE_VERSION,
      NAMESPACE,
      RESOURCE_PLURAL,
      apiObj.metadata.name,
      status
    )
  } catch (err) {
    logger.error('Error updating status of the custom resource ' + apiObj.metadata.name, err)
  }
}

// Helpers to continue watching after an event
function onDone (err: any) {
  logger.error(`error: ${err?.message} - connection closed. ${err}`)
  setTimeout(watchResource, 1000)
}

async function watchResource (): Promise<any> {
  const path = `/apis/${RESOURCE_GROUP}/${RESOURCE_VERSION}/namespaces/${NAMESPACE}/${RESOURCE_PLURAL}`
  logger.info(`Watching Permission Exclusions Resources: ${path}`)
  return watch.watch(
    path,
    {},
    onEvent,
    onDone
  )
}

// The watch has begun
export async function startOperator (): Promise<void> {
  try {
    await watchResource()
    healthStatus = 'OK'
  } catch (err: any) {
    if (err.message === 'No currently active cluster') {
      healthStatus = 'Error: Can not connect to K8S API'
      logger.error('Can not connect to K8S API')
    } else {
      healthStatus = 'Error: ' + err.message
      logger.error(err.stack)
    }
  }
}

export function getHealthStatus () : string {
  return healthStatus
}
