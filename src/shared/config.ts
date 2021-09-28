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

import rc from 'rc'
import parse from 'parse-strings-in-object'
import Config from '../../config/default.json'
import Package from '../../package.json'
export interface ServiceConfig {
  // package.json
  PACKAGE: Record<string, unknown>;

  WATCH_RESOURCE_GROUP: string;
  WATCH_RESOURCE_VERSION: string;
  WATCH_RESOURCE_PLURAL: string;
  WATCH_NAMESPACE: string;
  ORY_KETO_READ_SERVICE_URL: string;
  ORY_KETO_WRITE_SERVICE_URL: string;
  KETO_QUEUE_PROCESS_INTERVAL_MS: number;

  ERROR_HANDLING: {
    includeCauseExtension: boolean;
    truncateExtensions: boolean;
  };
  INSTRUMENTATION: {
    METRICS: {
      DISABLED: boolean;
      labels: {
        eventId: string;
      };
      config: {
        timeout: number;
        prefix: string;
        defaultLabels?: Map<string, string>;
      };
    };
  };
}

const RC = parse(rc('ROLE_PERM_OPERATOR', Config)) as ServiceConfig

export default {
  ...RC,
  PACKAGE: Package
}
