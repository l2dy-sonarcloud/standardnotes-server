import 'reflect-metadata'

import { TokenEncoderInterface, CrossServiceTokenData } from '@standardnotes/security'
import { ProjectorInterface } from '../../../Projection/ProjectorInterface'
import { Session } from '../../Session/Session'
import { User } from '../../User/User'
import { Role } from '../../Role/Role'
import { UserRepositoryInterface } from '../../User/UserRepositoryInterface'
import { GetUserAnalyticsId } from '../GetUserAnalyticsId/GetUserAnalyticsId'

import { CreateCrossServiceToken } from './CreateCrossServiceToken'

describe('CreateCrossServiceToken', () => {
  let userProjector: ProjectorInterface<User>
  let sessionProjector: ProjectorInterface<Session>
  let roleProjector: ProjectorInterface<Role>
  let tokenEncoder: TokenEncoderInterface<CrossServiceTokenData>
  let getUserAnalyticsId: GetUserAnalyticsId
  let userRepository: UserRepositoryInterface
  const jwtTTL = 60

  let session: Session
  let user: User
  let role: Role

  const createUseCase = (analyticsEnabled = true) =>
    new CreateCrossServiceToken(
      userProjector,
      sessionProjector,
      roleProjector,
      tokenEncoder,
      getUserAnalyticsId,
      userRepository,
      analyticsEnabled,
      jwtTTL,
    )

  beforeEach(() => {
    session = {} as jest.Mocked<Session>

    user = {} as jest.Mocked<User>
    user.roles = Promise.resolve([role])

    userProjector = {} as jest.Mocked<ProjectorInterface<User>>
    userProjector.projectSimple = jest.fn().mockReturnValue({ bar: 'baz' })

    roleProjector = {} as jest.Mocked<ProjectorInterface<Role>>
    roleProjector.projectSimple = jest.fn().mockReturnValue({ name: 'role1', uuid: '1-3-4' })

    sessionProjector = {} as jest.Mocked<ProjectorInterface<Session>>
    sessionProjector.projectCustom = jest.fn().mockReturnValue({ foo: 'bar' })
    sessionProjector.projectSimple = jest.fn().mockReturnValue({ test: 'test' })

    tokenEncoder = {} as jest.Mocked<TokenEncoderInterface<CrossServiceTokenData>>
    tokenEncoder.encodeExpirableToken = jest.fn().mockReturnValue('foobar')

    getUserAnalyticsId = {} as jest.Mocked<GetUserAnalyticsId>
    getUserAnalyticsId.execute = jest.fn().mockReturnValue({ analyticsId: 123 })

    userRepository = {} as jest.Mocked<UserRepositoryInterface>
    userRepository.findOneByUuid = jest.fn().mockReturnValue(user)
  })

  it('should create a cross service token for user', async () => {
    await createUseCase().execute({
      user,
      session,
    })

    expect(tokenEncoder.encodeExpirableToken).toHaveBeenCalledWith(
      {
        analyticsId: 123,
        roles: [
          {
            name: 'role1',
            uuid: '1-3-4',
          },
        ],
        session: {
          test: 'test',
        },
        user: {
          bar: 'baz',
        },
      },
      60,
    )
  })

  it('should create a cross service token for user - analytics disabled', async () => {
    await createUseCase(false).execute({
      user,
      session,
    })

    expect(tokenEncoder.encodeExpirableToken).toHaveBeenCalledWith(
      {
        roles: [
          {
            name: 'role1',
            uuid: '1-3-4',
          },
        ],
        session: {
          test: 'test',
        },
        user: {
          bar: 'baz',
        },
      },
      60,
    )
  })

  it('should create a cross service token for user without a session', async () => {
    await createUseCase().execute({
      user,
    })

    expect(tokenEncoder.encodeExpirableToken).toHaveBeenCalledWith(
      {
        analyticsId: 123,
        roles: [
          {
            name: 'role1',
            uuid: '1-3-4',
          },
        ],
        user: {
          bar: 'baz',
        },
      },
      60,
    )
  })

  it('should create a cross service token for user by user uuid', async () => {
    await createUseCase().execute({
      userUuid: '1-2-3',
    })

    expect(tokenEncoder.encodeExpirableToken).toHaveBeenCalledWith(
      {
        analyticsId: 123,
        roles: [
          {
            name: 'role1',
            uuid: '1-3-4',
          },
        ],
        user: {
          bar: 'baz',
        },
      },
      60,
    )
  })

  it('should throw an error if user does not exist', async () => {
    userRepository.findOneByUuid = jest.fn().mockReturnValue(null)

    let caughtError = null
    try {
      await createUseCase().execute({
        userUuid: '1-2-3',
      })
    } catch (error) {
      caughtError = error
    }

    expect(caughtError).not.toBeNull()
  })
})