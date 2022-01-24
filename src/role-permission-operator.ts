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
import { RoleResources } from "./lib/role-resources"
import { RolePermissions, PermissionExclusionsValidator } from './validation/permission-exclusions'
import KetoChangeProcessor from "./lib/keto-change-processor"
import { KetoTuples } from './lib/role-permission-keto-tuples'
import { ValidationError } from "./validation/validation-error"

const permissionExclusionsValidator = new PermissionExclusionsValidator(Config)
// Configure the operator to monitor your custom resources
// and the namespace for your custom resources
const RESOURCE_GROUP = Config.ROLE_PERMISSION_OPERATOR.WATCH_RESOURCE_GROUP
const RESOURCE_VERSION = Config.ROLE_PERMISSION_OPERATOR.WATCH_RESOURCE_VERSION
const RESOURCE_PLURAL = Config.ROLE_PERMISSION_OPERATOR.WATCH_RESOURCE_PLURAL
const NAMESPACE = Config.WATCH_NAMESPACE

const roleResourceStore = new RoleResources()
const oryKeto = new KetoTuples()
const ketoChangeProcessor = KetoChangeProcessor.getInstance()
const updateKetoFn = async (fnArgs: any) => {
  const boundedFn = oryKeto.updateAllRolePermissions.bind(oryKeto)
  boundedFn(fnArgs.subjectObjectCombos)
  logger.info('Updated the relation tuples in Keto', fnArgs.subjectObjectCombos)
}

const kc = new k8s.KubeConfig()
kc.loadFromDefault()

let healthStatus = "Unknown"

// If we want to do something in K8S, we can use the following APIs
// const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
// const k8sApiMC = kc.makeApiClient(k8s.CustomObjectsApi);
// const k8sApiPods = kc.makeApiClient(k8s.CoreV1Api);
const k8sApiCustomObjects = kc.makeApiClient(k8s.CustomObjectsApi)

// Listen for events or notifications and act accordingly
const watch = new k8s.Watch(kc)

async function onEvent(phase: string, apiObj: any) {
  logger.info(`Received event in phase ${phase} for the resource ${apiObj?.metadata?.name}`)
  const resourceName = apiObj?.metadata?.name
  const role = apiObj?.spec?.role
  const permissions = apiObj?.spec?.permissions
  const generation = apiObj?.metadata?.generation + ''
  // Ignore status updates by comparing generation number
  if (phase === 'MODIFIED' && roleResourceStore.checkHash(resourceName, generation)) {
    return
  }
  if (resourceName && role && permissions) {
    ketoChangeProcessor.queue.add(async () => {
      if (phase === 'ADDED' || phase === 'MODIFIED') {
        // Get the temporary consolidated role assignments based on already stored roles
        const consolidatedRolePermissions = roleResourceStore.getConsolidatedTempData(resourceName, role, permissions)
        const rolePermissions: RolePermissions[] = Object.entries(consolidatedRolePermissions).map(item => {
          return {
            rolename: (<any>item[1]).role,
            permissions: (<any>item[1]).permissions
          }
        })
        // Validate the resultant calculated permission exclusions with role permission assignments and user role mappings
        try {
          await permissionExclusionsValidator.validateRolePermissions(rolePermissions)
          roleResourceStore.updateRoleResource(resourceName, generation, role, permissions)
          // Set the status of our resource
          await _updateResourceStatus(apiObj, 'VALIDATED')
        } catch (err) {
          logger.error(`Validation failed for the role permission resource: ${resourceName}`)
          if (err instanceof ValidationError) {
            console.log(err.validationErrors)
            await _updateResourceStatus(apiObj, 'VALIDATION FAILED', err.validationErrors)
          } else {
            await _updateResourceStatus(apiObj, 'UNKNOWN ERROR')
          }
          return
        }
        // roleResourceStore.updateRoleResource(resourceName, role, permissions)
      } else if (phase === 'DELETED') {
        roleResourceStore.deleteRoleResource(resourceName)
      } else {
        logger.warn(`Unknown event type: ${phase}`)
        return
      }
      const rolePermissionCombos = roleResourceStore.getUniqueRolePermissionCombos()
      logger.info('Current permissions in memory' + JSON.stringify(rolePermissionCombos))
      const queueArgs = {
        subjectObjectCombos: rolePermissionCombos
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
  logger.error(`Connection closed. ${err}`)
  setTimeout(watchResource,1000)
}

async function watchResource (): Promise<any> {
  logger.info('Watching RolePermission Resources')
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

// functions for unit tests
export function getRoleResourceStore () : RoleResources {
  return roleResourceStore
}
export function getketoChangeProcessor () : KetoChangeProcessor {
  return ketoChangeProcessor
}
export function getWatch () : k8s.Watch {
  return watch
}
