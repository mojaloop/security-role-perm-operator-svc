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
import * as k8s from "@kubernetes/client-node"
import { logger } from './shared/logger'
import Config from './shared/config'
import { PermissionExclusionResources } from './lib/permission-exclusions-store'
import { KetoChangeProcessor } from "./lib/keto-change-processor"
import { KetoTuples } from './lib/permission-exclusions-keto-tuples'

// Configure the operator to monitor your custom resources
// and the namespace for your custom resources
const RESOURCE_GROUP = Config.PERMISSION_EXCLUSIONS_OPERATOR.WATCH_RESOURCE_GROUP
const RESOURCE_VERSION = Config.PERMISSION_EXCLUSIONS_OPERATOR.WATCH_RESOURCE_VERSION
const RESOURCE_PLURAL = Config.PERMISSION_EXCLUSIONS_OPERATOR.WATCH_RESOURCE_PLURAL
const NAMESPACE = Config.WATCH_NAMESPACE

const permissionExclusionResourceStore = new PermissionExclusionResources()
const oryKeto = new KetoTuples()
const permissionExclusionsChangeProcessor = new KetoChangeProcessor(oryKeto.updateAllPermissionExclusions.bind(oryKeto))

const kc = new k8s.KubeConfig()
kc.loadFromDefault()

// If we want to do something in K8S, we can use the following APIs
// const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
// const k8sApiMC = kc.makeApiClient(k8s.CustomObjectsApi);
// const k8sApiPods = kc.makeApiClient(k8s.CoreV1Api);

// Listen for events or notifications and act accordingly
const watch = new k8s.Watch(kc)

async function onEvent(phase: string, apiObj: any) {
  logger.info(`Received event in phase ${phase} for the resource ${apiObj?.metadata?.name}`)
  // try {
  //   const result = await k8sApiMC.listNamespacedCustomObject(
  //     RESOURCE_GROUP,
  //     RESOURCE_VERSION,
  //     NAMESPACE,
  //     RESOURCE_PLURAL,
  //   )
  //   console.log(JSON.stringify(result.body, null, 2))
  //   console.log(apiObj?.spec)
  // } catch (err: any) {
  //   logger.error(err);
  // }
  const resourceName = apiObj?.metadata?.name
  const permissionsA = apiObj?.spec?.permissionsA
  const permissionsB = apiObj?.spec?.permissionsB
  if (resourceName && permissionsA && permissionsB) {
    if (phase == "ADDED") {
      permissionExclusionResourceStore.updateResource(resourceName, permissionsA, permissionsB)
    } else if (phase == "MODIFIED") {
      permissionExclusionResourceStore.updateResource(resourceName, permissionsA, permissionsB)
    } else if (phase == "DELETED") {
      permissionExclusionResourceStore.deleteResource(resourceName)
    } else {
      logger.warn(`Unknown event type: ${phase}`)
      return
    }
    const permissionExclusionCombos = permissionExclusionResourceStore.getUniquePermissionExclusionCombos()
    logger.info('Current permission exclusions in memory' + JSON.stringify(permissionExclusionCombos))
    // rolePermissionChangeProcessor.addToQueue(rolePermissionCombos)
    permissionExclusionsChangeProcessor.addToQueue(permissionExclusionCombos)
  }
}

// Helpers to continue watching after an event
function onDone(err: any) {
  logger.error(`Connection closed. ${err}`)
  setTimeout(watchResource,1000)
}

async function watchResource (): Promise<any> {
  logger.info('Watching Permission Exclusions Resources')
  return watch.watch(
    `/apis/${RESOURCE_GROUP}/${RESOURCE_VERSION}/namespaces/${NAMESPACE}/${RESOURCE_PLURAL}`,
    {},
    onEvent,
    onDone
  )
}

// The watch has begun
export async function startOperator (): Promise<void> {
  try {
    await watchResource()
  } catch (err: any) {
    if (err.message === 'No currently active cluster') {
      logger.error('Can not connect to K8S API')
    } else {
      logger.error(err.stack)
    }
  }
}

// functions for unit tests
export function getPermissionExclusionResourceStore () : PermissionExclusionResources {
  return permissionExclusionResourceStore
}
// export function getRolePermissionChangeProcessor () : RolePermissionChangeProcessor {
//   return rolePermissionChangeProcessor
// }
export function getWatch () : k8s.Watch {
  return watch
}
