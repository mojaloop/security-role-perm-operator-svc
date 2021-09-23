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

import Config from './shared/config';
import { RolePermissionModel } from './role-resources';
import { KetoTuples } from './keto-tuples';
import { logger } from './shared/logger'

const oryKeto = new KetoTuples();

export class RolePermissionChangeProcessor {

  queue: RolePermissionModel[];

  constructor () {
    this.queue = [];
    setImmediate(this._processQueue.bind(this))
  }

  _pushQueue (element: RolePermissionModel) {
    this.queue.push( element );
  }
  _popQueue () {
    return this.queue.shift();
  }
  _getFirstItemInQueue () {
    if (this.queue.length > 0) {
      return this.queue[0];
    } else {
      return null
    }
  }

  async _processQueue () {
    const rolePermission = this._getFirstItemInQueue()
    if (rolePermission) {
      try {
        await this._updateRolePermission(rolePermission)
        this._popQueue()
      } catch(err: any) {
        logger.error(err.message)
      }
    }
    setTimeout(this._processQueue.bind(this), Config.KETO_QUEUE_PROCESS_INTERVAL_MS);
  }

  async _updateRolePermission (rolePermission: RolePermissionModel) {
    await oryKeto.updateRolePermissions(rolePermission.role, rolePermission.permissions);
    logger.log('Updated the role permissions in Keto', rolePermission.role, rolePermission.permissions)
    // const updatedPermissions = await oryKeto.getRolePermissions(rolePermission.role);
    // logger.debug(rolePermission.role, updatedPermissions);
  }

  addToQueue ( rolePermission: RolePermissionModel ) {
    this._pushQueue( rolePermission );
  }

  getQueue () {
    return this.queue
  }

}
