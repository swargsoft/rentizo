/**
 * Thin wrapper around @react-oauth/google's useGoogleLogin hook.
 * Provides imperative signIn() and manages the access token globally.
 */

let _accessToken = null
let _tokenExpiry = null
let _profile     = null    // { email, name, picture }

export function setGoogleToken(token, expiresIn = 3599) {
  _accessToken = token
  _tokenExpiry = Date.now() + (expiresIn - 30) * 1000
  console.log('[GoogleAuth] Token set, valid for', expiresIn, 's')
}

export function getGoogleToken() {
  if (_accessToken && _tokenExpiry && Date.now() < _tokenExpiry) {
    return _accessToken
  }
  return null
}

export function setGoogleProfile(profile) {
  _profile = profile
}

export function getGoogleProfile() {
  return _profile
}

export function clearGoogleSession() {
  _accessToken = null
  _tokenExpiry = null
  _profile     = null
}

export async function fetchGoogleProfile(accessToken) {
  const res  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const data = await res.json()
  return { id: data.sub, email: data.email, name: data.name, picture: data.picture }
}