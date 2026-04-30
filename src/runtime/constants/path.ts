export const OIDC_BASE_PATH = '/api/_oidc'

export const OIDC_ROUTES = {
  login: `${OIDC_BASE_PATH}/login`,
  callback: `${OIDC_BASE_PATH}/callback`,
  logout: `${OIDC_BASE_PATH}/logout`,
  debug: `${OIDC_BASE_PATH}/debug`,
  session: `${OIDC_BASE_PATH}/session`,
}
