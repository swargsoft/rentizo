/**
 * OpenRide Drive API Client
 *
 * Two storage spaces:
 *   appDataFolder  — hidden, stores nostr private key (nostr-key.json)
 *   regular Drive  — public folder "Rentizo Media (do not delete)"
 *
 * Folder structure (regular Drive):
 *   Rentizo Media (do not delete)/
 *     profile/
 *       profile-photo.jpg
 *       banner.jpg          (owners only)
 *       kyc-documents/      (riders only)
 *     listings/
 *       {listingId}/
 *         img0.jpg … img4.jpg
 */

const DRIVE_API  = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const MEDIA_ROOT_NAME = 'Rentizo Media (do not delete)'
const KEY_FILE_NAME   = 'nostr-key.json'

class DriveApi {
  constructor() {
    this.accessToken     = null
    this.mediaRootId     = null   // "Rentizo Media (do not delete)" folder ID
    this._folderCache    = {}     // path → folderId
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  setToken(token) {
    this.accessToken = token
    // Reset cached root when token changes (new user)
    this.mediaRootId  = null
    this._folderCache = {}
  }

  // ── Internal request helper ───────────────────────────────────────────────

  async _req(url, options = {}) {
    if (!this.accessToken) throw new Error('Drive: not authenticated')
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message ?? `Drive API error ${res.status}`)
    }
    return res
  }

  // ── Folder helpers ────────────────────────────────────────────────────────

  /**
   * Find a folder by name under a parent (or root if no parent).
   * Returns folderId or null.
   */
  async _findFolder(name, parentId = null) {
    const parentClause = parentId
      ? `and '${parentId}' in parents`
      : `and 'root' in parents`
    const q = encodeURIComponent(
      `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false ${parentClause}`
    )
    const res  = await this._req(`${DRIVE_API}/files?q=${q}&fields=files(id,name)`)
    const data = await res.json()
    return data.files?.[0]?.id ?? null
  }

  /**
   * Create a folder under a parent (or root if no parent).
   * Returns folderId.
   */
  async _createFolder(name, parentId = null, hidden = false) {
    const body = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(hidden
        ? { parents: ['appDataFolder'] }
        : parentId
          ? { parents: [parentId] }
          : {}
      ),
    }
    const res    = await this._req(`${DRIVE_API}/files`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const folder = await res.json()
    return folder.id
  }

  /**
   * Get or create a folder. Uses cache.
   * @param {string} cacheKey — unique cache key
   * @param {string} name — folder name
   * @param {string|null} parentId — parent folder ID
   * @param {boolean} hidden — store in appDataFolder
   */
  async _ensureFolder(cacheKey, name, parentId = null, hidden = false) {
    if (this._folderCache[cacheKey]) return this._folderCache[cacheKey]
    let id = hidden ? null : await this._findFolder(name, parentId)
    if (!id) id = await this._createFolder(name, parentId, hidden)
    this._folderCache[cacheKey] = id
    return id
  }

  // ── Public folder structure ───────────────────────────────────────────────

  /** "Rentizo Media (do not delete)" root */
  async ensureMediaRoot() {
    if (this.mediaRootId) return this.mediaRootId
    this.mediaRootId = await this._ensureFolder(
      '__media_root__', MEDIA_ROOT_NAME, null, false
    )
    return this.mediaRootId
  }

  /** profile/ under media root */
  async ensureProfileFolder() {
    const rootId = await this.ensureMediaRoot()
    return this._ensureFolder('profile', 'profile', rootId)
  }

  /** profile/kyc-documents/ */
  async ensureKycFolder() {
    const profileId = await this.ensureProfileFolder()
    return this._ensureFolder('kyc', 'kyc-documents', profileId)
  }

  /** listings/{listingId}/ */
  async ensureListingFolder(listingId) {
    const rootId = await this.ensureMediaRoot()
    const listingsId = await this._ensureFolder('listings', 'listings', rootId)
    return this._ensureFolder(`listing_${listingId}`, listingId, listingsId)
  }

  // ── Upload helper ─────────────────────────────────────────────────────────

  /**
   * Upload a file using multipart upload.
   * If existingFileId provided → PATCH update (no folder needed).
   * Returns { id, name }
   */
  async _upload(folderId, filename, blob, mimeType, existingFileId = null) {
    if (existingFileId) {
      // Update content only
      const res = await this._req(
        `${DRIVE_UPLOAD}/files/${existingFileId}?uploadType=media`,
        { method: 'PATCH', headers: { 'Content-Type': mimeType }, body: blob }
      )
      return res.json()
    }

    // New file — multipart
    const metadata = { name: filename, parents: [folderId] }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', blob)

    const res = await fetch(
      `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body:    form,
      }
    )
    if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`)
    return res.json()
  }

  /** Make a file readable by anyone (public CDN) */
  async makePublic(fileId) {
    await this._req(`${DRIVE_API}/files/${fileId}/permissions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role: 'reader', type: 'anyone' }),
    }).catch(err => console.warn('[Drive] makePublic failed:', err.message))
  }

  // ── Nostr key storage (appDataFolder) ─────────────────────────────────────

  /**
   * Search appDataFolder for the key file.
   * Returns fileId or null.
   */
  async _findKeyFile() {
    const q = encodeURIComponent(
      `name='${KEY_FILE_NAME}' and trashed=false`
    )
    const res  = await this._req(
      `${DRIVE_API}/files?q=${q}&spaces=appDataFolder&fields=files(id,name)`
    )
    const data = await res.json()
    return data.files?.[0]?.id ?? null
  }

  /**
   * Store the Nostr private key in appDataFolder.
   * Creates or updates nostr-key.json.
   * @param {Uint8Array} secretKey
   */
  async saveNostrKey(secretKey) {
    const hex     = Array.from(secretKey).map(b => b.toString(16).padStart(2,'0')).join('')
    const payload = JSON.stringify({ v: 1, hex, savedAt: Date.now() })
    const blob    = new Blob([payload], { type: 'application/json' })

    const existingId = await this._findKeyFile()

    if (existingId) {
      // Update existing
      await this._req(
        `${DRIVE_UPLOAD}/files/${existingId}?uploadType=media`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: blob }
      )
      console.log('[Drive] Nostr key updated in appDataFolder')
      return existingId
    }

    // Create new in appDataFolder
    const metadata = { name: KEY_FILE_NAME, parents: ['appDataFolder'] }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', blob)

    const res = await fetch(
      `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id`,
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body:    form,
      }
    )
    if (!res.ok) throw new Error(`Key save failed: ${res.status}`)
    const data = await res.json()
    console.log('[Drive] Nostr key saved in appDataFolder:', data.id)
    return data.id
  }

  /**
   * Load the Nostr private key from appDataFolder.
   * Returns Uint8Array secretKey or null if not found.
   */
  async loadNostrKey() {
    const fileId = await this._findKeyFile()
    if (!fileId) return null

    const res  = await this._req(`${DRIVE_API}/files/${fileId}?alt=media`)
    const text = await res.text()
    const data = JSON.parse(text)

    if (!data.hex) throw new Error('Invalid key file format')
    const bytes = Uint8Array.from(data.hex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
    console.log('[Drive] Nostr key loaded from appDataFolder')
    return bytes
  }

  // ── Profile images ────────────────────────────────────────────────────────

  /**
   * Upload profile photo. Returns Drive fileId.
   */
  async uploadProfilePhoto(blob) {
    const folderId = await this.ensureProfileFolder()
    // Check if existing
    const q = encodeURIComponent(
      `name='profile-photo.jpg' and '${folderId}' in parents and trashed=false`
    )
    const searchRes  = await this._req(`${DRIVE_API}/files?q=${q}&fields=files(id)`)
    const searchData = await searchRes.json()
    const existingId = searchData.files?.[0]?.id ?? null

    const file = await this._upload(folderId, 'profile-photo.jpg', blob, 'image/jpeg', existingId)
    await this.makePublic(file.id ?? existingId)
    console.log('[Drive] Profile photo uploaded:', file.id ?? existingId)
    return file.id ?? existingId
  }

  /**
   * Upload banner image (owners only). Returns Drive fileId.
   */
  async uploadBanner(blob) {
    const folderId = await this.ensureProfileFolder()
    const q = encodeURIComponent(
      `name='banner.jpg' and '${folderId}' in parents and trashed=false`
    )
    const searchRes  = await this._req(`${DRIVE_API}/files?q=${q}&fields=files(id)`)
    const searchData = await searchRes.json()
    const existingId = searchData.files?.[0]?.id ?? null

    const file = await this._upload(folderId, 'banner.jpg', blob, 'image/jpeg', existingId)
    await this.makePublic(file.id ?? existingId)
    return file.id ?? existingId
  }

  // ── KYC documents ─────────────────────────────────────────────────────────

  /**
   * Upload a KYC document PDF (driving license or Aadhaar).
   * @param {Blob} blob
   * @param {'driving-license'|'aadhaar'} docType
   * @returns {string} fileId
   */
  async uploadKycDocument(blob, docType) {
    const folderId = await this.ensureKycFolder()
    const filename = `${docType}.pdf`
    const q = encodeURIComponent(
      `name='${filename}' and '${folderId}' in parents and trashed=false`
    )
    const searchRes  = await this._req(`${DRIVE_API}/files?q=${q}&fields=files(id)`)
    const searchData = await searchRes.json()
    const existingId = searchData.files?.[0]?.id ?? null

    const file = await this._upload(folderId, filename, blob, 'application/pdf', existingId)
    // KYC docs are NOT made public — viewer needs auth
    return file.id ?? existingId
  }

  // ── Listing images ────────────────────────────────────────────────────────

  /**
   * Upload a listing image. Returns Drive fileId.
   * @param {Blob} blob — compressed image blob
   * @param {string} listingId
   * @param {number} index — 0–4
   */
  async uploadListingImage(blob, listingId, index) {
    const folderId = await this.ensureListingFolder(listingId)
    const filename = `img${index}.jpg`
    const q = encodeURIComponent(
      `name='${filename}' and '${folderId}' in parents and trashed=false`
    )
    const searchRes  = await this._req(`${DRIVE_API}/files?q=${q}&fields=files(id)`)
    const searchData = await searchRes.json()
    const existingId = searchData.files?.[0]?.id ?? null

    const file = await this._upload(folderId, filename, blob, 'image/jpeg', existingId)
    await this.makePublic(file.id ?? existingId)
    console.log(`[Drive] Listing image ${listingId}/${index} uploaded:`, file.id ?? existingId)
    return file.id ?? existingId
  }

  /**
   * Upload multiple listing images in parallel.
   * @param {File[]} files — array of File/Blob objects (max 5)
   * @param {string} listingId
   * @returns {string[]} array of fileIds
   */
  async uploadListingImages(files, listingId) {
    const { compressListingImage } = await import('./imageCompression.js')
    const results = await Promise.allSettled(
      files.slice(0, 5).map(async (file, index) => {
        const compressed = await compressListingImage(file)
        return this.uploadListingImage(compressed, listingId, index)
      })
    )
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
  }

  // ── URL helpers ───────────────────────────────────────────────────────────

  /** Public CDN URL for images */
  static imageUrl(fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`
  }

  /** Preview URL for PDFs */
  static previewUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`
  }
}

// Singleton
const driveApi = new DriveApi()
export default driveApi