import { describe, expect, it } from 'vitest'
import { toSessionUser } from '../src/runtime/utils/sessionUser'

describe('toSessionUser', () => {
  it('maps only safe user fields from token payload', () => {
    const user = toSessionUser({
      sub: 'user-id',
      email: 'user@example.test',
      email_verified: true,
      name: 'Test User',
      preferred_username: 'test',
      given_name: 'Test',
      family_name: 'User',
      access_token: 'secret',
      refresh_token: 'secret',
      realm_access: {
        roles: ['admin'],
      },
    } as any)

    expect(user).toEqual({
      sub: 'user-id',
      email: 'user@example.test',
      email_verified: true,
      name: 'Test User',
      preferred_username: 'test',
      given_name: 'Test',
      family_name: 'User',
    })
    expect(JSON.stringify(user)).not.toContain('secret')
    expect(user).not.toHaveProperty('realm_access')
  })
})
