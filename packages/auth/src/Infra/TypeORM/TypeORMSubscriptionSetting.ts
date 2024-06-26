import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'subscription_settings' })
@Index('index_settings_on_name_and_user_subscription_uuid', ['name', 'userSubscriptionUuid'])
export class TypeORMSubscriptionSetting {
  @PrimaryGeneratedColumn('uuid')
  declare uuid: string

  @Column({
    length: 255,
  })
  declare name: string

  @Column({
    type: 'text',
    nullable: true,
  })
  declare value: string | null

  @Column({
    name: 'server_encryption_version',
    type: 'tinyint',
    default: 0,
  })
  declare serverEncryptionVersion: number

  @Column({
    name: 'created_at',
    type: 'bigint',
  })
  declare createdAt: number

  @Column({
    name: 'updated_at',
    type: 'bigint',
  })
  @Index('index_subcsription_settings_on_updated_at')
  declare updatedAt: number

  @Column({
    name: 'user_subscription_uuid',
    length: 36,
  })
  declare userSubscriptionUuid: string

  @Column({
    type: 'tinyint',
    width: 1,
    nullable: false,
    default: 0,
  })
  declare sensitive: boolean
}
