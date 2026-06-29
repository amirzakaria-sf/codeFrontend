const ACCESS_TOKEN_KEY = "foundry_access_token"
const REFRESH_TOKEN_KEY = "foundry_refresh_token"

export function getAccessToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(access: string, refresh: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access)
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function setAccessToken(access: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access)
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_KEY)
}
