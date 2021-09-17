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
import * as k8s from "@kubernetes/client-node";

import { RoleResources } from "./role-resources";

// Configure the operator to monitor your custom resources
// and the namespace for your custom resources

const RESOURCE_GROUP = "mojaloop.io";
const RESOURCE_VERSION = "v1";
const RESOURCE_PLURAL = "mojalooproles";
const NAMESPACE = "mojaloop";

const roleResourceStore = new RoleResources();

// Generates a client from an existing kubeconfig whether in memory
// or from a file.
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// Creates the different clients for the different parts of the API.
const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sApiMC = kc.makeApiClient(k8s.CustomObjectsApi);
const k8sApiPods = kc.makeApiClient(k8s.CoreV1Api);

// This is to listen for events or notifications and act accordingly
// after all it is the core part of a controller or operator to
// watch or observe, compare and reconcile
const watch = new k8s.Watch(kc);

async function onEvent(phase: string, apiObj: any) {
  log(`Received event in phase ${phase}.`);

  try {
    // const result = await k8sApiMC.listNamespacedCustomObject(
    //   RESOURCE_GROUP,
    //   RESOURCE_VERSION,
    //   NAMESPACE,
    //   RESOURCE_PLURAL,
    // )
    // console.log(JSON.stringify(result.body, null, 2))
    // console.log(apiObj?.spec)
  } catch (err: any) {
    log(err);
  }
  const resourceName = apiObj?.metadata?.name
  const role = apiObj?.spec?.role
  const permissions = apiObj?.spec?.permissions
  if (phase == "ADDED") {
    // scheduleReconcile(apiObj);
    roleResourceStore.updateRoleResource(resourceName, role, permissions);
  } else if (phase == "MODIFIED") {
    roleResourceStore.updateRoleResource(resourceName, role, permissions);
  } else if (phase == "DELETED") {
    roleResourceStore.deleteRoleResource(resourceName);
  } else {
    log(`Unknown event type: ${phase}`);
  }
  // console.log(JSON.stringify(roleResourceStore.getData(), null, 2))
  log("Stored roles:");
  log(roleResourceStore.getAggregatedRolePermissions());
  // log("Generated Keto Tuples (To be synced with Keto service):");
  // log(roleResourceStore.generateKetoTuples());
}

// Helpers to continue watching after an event
function onDone(err: any) {
  log(`Connection closed. ${err}`);
  watchResource();
}

async function watchResource(): Promise<any> {
  log("Watching API");
  return watch.watch(
    `/apis/${RESOURCE_GROUP}/${RESOURCE_VERSION}/namespaces/${NAMESPACE}/${RESOURCE_PLURAL}`,
    {},
    onEvent,
    onDone,
  );
}

// The watch has begun
async function main() {
  await watchResource();
}

// Helper to pretty print logs
function log(message: any) {
  console.log(`${new Date().toLocaleString()}: `, message);
}

// Helper to get better errors if we miss any promise rejection.
process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
});

// Run
main();
