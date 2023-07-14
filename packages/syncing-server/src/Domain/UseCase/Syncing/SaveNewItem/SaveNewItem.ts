import {
  ContentType,
  Dates,
  Result,
  Timestamps,
  UniqueEntityId,
  UseCaseInterface,
  Uuid,
} from '@standardnotes/domain-core'
import { TimerInterface } from '@standardnotes/time'
import { DomainEventPublisherInterface } from '@standardnotes/domain-events'

import { Item } from '../../../Item/Item'
import { SaveNewItemDTO } from './SaveNewItemDTO'
import { ItemRepositoryInterface } from '../../../Item/ItemRepositoryInterface'
import { DomainEventFactoryInterface } from '../../../Event/DomainEventFactoryInterface'

export class SaveNewItem implements UseCaseInterface<Item> {
  constructor(
    private itemRepository: ItemRepositoryInterface,
    private timer: TimerInterface,
    private domainEventPublisher: DomainEventPublisherInterface,
    private domainEventFactory: DomainEventFactoryInterface,
  ) {}

  async execute(dto: SaveNewItemDTO): Promise<Result<Item>> {
    let updatedWithSession = null
    if (dto.sessionUuid) {
      const sessionUuidOrError = Uuid.create(dto.sessionUuid)
      if (sessionUuidOrError.isFailed()) {
        return Result.fail(sessionUuidOrError.getError())
      }
      updatedWithSession = sessionUuidOrError.getValue()
    }
    const userUuidOrError = Uuid.create(dto.userUuid)
    if (userUuidOrError.isFailed()) {
      return Result.fail(userUuidOrError.getError())
    }
    const userUuid = userUuidOrError.getValue()

    const contentTypeOrError = ContentType.create(dto.itemHash.content_type)
    if (contentTypeOrError.isFailed()) {
      return Result.fail(contentTypeOrError.getError())
    }
    const contentType = contentTypeOrError.getValue()

    let duplicateOf = null
    if (dto.itemHash.duplicate_of) {
      const duplicateOfOrError = Uuid.create(dto.itemHash.duplicate_of)
      if (duplicateOfOrError.isFailed()) {
        return Result.fail(duplicateOfOrError.getError())
      }
      duplicateOf = duplicateOfOrError.getValue()
    }

    const now = this.timer.getTimestampInMicroseconds()
    const nowDate = this.timer.convertMicrosecondsToDate(now)

    let createdAtDate = nowDate
    let createdAtTimestamp = now
    if (dto.itemHash.created_at_timestamp) {
      createdAtTimestamp = dto.itemHash.created_at_timestamp
      createdAtDate = this.timer.convertMicrosecondsToDate(createdAtTimestamp)
    } else if (dto.itemHash.created_at) {
      createdAtTimestamp = this.timer.convertStringDateToMicroseconds(dto.itemHash.created_at)
      createdAtDate = this.timer.convertStringDateToDate(dto.itemHash.created_at)
    }

    const datesOrError = Dates.create(createdAtDate, nowDate)
    if (datesOrError.isFailed()) {
      return Result.fail(datesOrError.getError())
    }
    const dates = datesOrError.getValue()

    const timestampsOrError = Timestamps.create(createdAtTimestamp, now)
    if (timestampsOrError.isFailed()) {
      return Result.fail(timestampsOrError.getError())
    }
    const timestamps = timestampsOrError.getValue()

    const itemOrError = Item.create(
      {
        updatedWithSession,
        content: dto.itemHash.content ?? null,
        userUuid,
        contentType,
        encItemKey: dto.itemHash.enc_item_key ?? null,
        authHash: dto.itemHash.auth_hash ?? null,
        itemsKeyId: dto.itemHash.items_key_id ?? null,
        duplicateOf,
        deleted: dto.itemHash.deleted ?? false,
        dates,
        timestamps,
      },
      new UniqueEntityId(dto.itemHash.uuid),
    )
    if (itemOrError.isFailed()) {
      return Result.fail(itemOrError.getError())
    }
    const newItem = itemOrError.getValue()

    await this.itemRepository.save(newItem)

    if (contentType.value !== null && [ContentType.TYPES.Note, ContentType.TYPES.File].includes(contentType.value)) {
      await this.domainEventPublisher.publish(
        this.domainEventFactory.createItemRevisionCreationRequested(
          newItem.id.toString(),
          newItem.props.userUuid.value,
        ),
      )
    }

    if (duplicateOf) {
      await this.domainEventPublisher.publish(
        this.domainEventFactory.createDuplicateItemSyncedEvent(newItem.id.toString(), newItem.props.userUuid.value),
      )
    }

    return Result.ok(newItem)
  }
}