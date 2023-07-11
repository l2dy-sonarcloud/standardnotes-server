import { ControllerContainerInterface } from '@standardnotes/domain-core'
import { BaseHttpController, results } from 'inversify-express-utils'
import { Request, Response } from 'express'

import { Item } from '../../../Domain/Item/Item'
import { SyncResponseFactoryResolverInterface } from '../../../Domain/Item/SyncResponse/SyncResponseFactoryResolverInterface'
import { CheckIntegrity } from '../../../Domain/UseCase/Syncing/CheckIntegrity/CheckIntegrity'
import { GetItem } from '../../../Domain/UseCase/Syncing/GetItem/GetItem'
import { ItemProjection } from '../../../Projection/ItemProjection'
import { ProjectorInterface } from '../../../Projection/ProjectorInterface'
import { ApiVersion } from '../../../Domain/Api/ApiVersion'
import { SyncItems } from '../../../Domain/UseCase/Syncing/SyncItems/SyncItems'
import { HttpStatusCode } from '@standardnotes/responses'

export class HomeServerItemsController extends BaseHttpController {
  constructor(
    protected syncItems: SyncItems,
    protected checkIntegrity: CheckIntegrity,
    protected getItem: GetItem,
    protected itemProjector: ProjectorInterface<Item, ItemProjection>,
    protected syncResponseFactoryResolver: SyncResponseFactoryResolverInterface,
    private controllerContainer?: ControllerContainerInterface,
  ) {
    super()

    if (this.controllerContainer !== undefined) {
      this.controllerContainer.register('sync.items.sync', this.sync.bind(this))
      this.controllerContainer.register('sync.items.check_integrity', this.checkItemsIntegrity.bind(this))
      this.controllerContainer.register('sync.items.get_item', this.getSingleItem.bind(this))
    }
  }

  async sync(request: Request, response: Response): Promise<results.JsonResult> {
    let itemHashes = []
    if ('items' in request.body) {
      itemHashes = request.body.items
    }

    const syncResult = await this.syncItems.execute({
      userUuid: response.locals.user.uuid,
      itemHashes,
      computeIntegrityHash: request.body.compute_integrity === true,
      syncToken: request.body.sync_token,
      cursorToken: request.body.cursor_token,
      sharedVaultUuids: request.body.shared_vault_uuids,
      limit: request.body.limit,
      contentType: request.body.content_type,
      apiVersion: request.body.api ?? ApiVersion.v20161215,
      snjsVersion: <string>request.headers['x-snjs-version'],
      readOnlyAccess: response.locals.readOnlyAccess,
      sessionUuid: response.locals.session ? response.locals.session.uuid : null,
    })
    if (syncResult.isFailed()) {
      return this.json({ error: { message: syncResult.getError() } }, HttpStatusCode.BadRequest)
    }

    const syncResponse = await this.syncResponseFactoryResolver
      .resolveSyncResponseFactoryVersion(request.body.api)
      .createResponse(syncResult.getValue())

    return this.json(syncResponse)
  }

  async checkItemsIntegrity(request: Request, response: Response): Promise<results.JsonResult> {
    let integrityPayloads = []
    if ('integrityPayloads' in request.body) {
      integrityPayloads = request.body.integrityPayloads
    }

    const result = await this.checkIntegrity.execute({
      userUuid: response.locals.user.uuid,
      integrityPayloads,
      freeUser: response.locals.freeUser,
    })

    if (result.isFailed()) {
      return this.json({ error: { message: result.getError() } }, HttpStatusCode.BadRequest)
    }

    return this.json({
      mismatches: result.getValue(),
    })
  }

  async getSingleItem(request: Request, response: Response): Promise<results.JsonResult> {
    const result = await this.getItem.execute({
      userUuid: response.locals.user.uuid,
      itemUuid: request.params.uuid,
    })

    if (result.isFailed()) {
      return this.json({ error: { message: result.getError() } }, 404)
    }

    return this.json({ item: await this.itemProjector.projectFull(result.getValue()) })
  }
}
