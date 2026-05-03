const CACHE_NAME = 'rentizo-images'
const key = (type, id, idx) => {
  const url =
    type === 'listing' ? `https://rentizo.local/images/listing/${id}/${idx}`
    : type === 'profile' ? `https://rentizo.local/images/profile/${id}`
    : `https://rentizo.local/images/misc/${id}`
  return new Request(url)
}

const getCache = () => caches.open(CACHE_NAME)

export async function storeListingImage(listingId, index, blob) {
  const cache = await getCache()
  await cache.put(key('listing', listingId, index), new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } }))
}

export async function storeProfileImage(pubkey, blob) {
  const cache = await getCache()
  await cache.put(key('profile', pubkey), new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } }))
}

export async function getListingImageUrl(listingId, index) {
  const cache = await getCache()
  const res = await cache.match(key('listing', listingId, index))
  if (!res) return null
  return URL.createObjectURL(await res.blob())
}

export async function getListingImageUrls(listingId, count = 5) {
  const urls = await Promise.all(Array.from({ length: count }, (_, i) => getListingImageUrl(listingId, i)))
  return urls.filter(Boolean)
}

export async function getProfileImageUrl(pubkey) {
  const cache = await getCache()
  const res = await cache.match(key('profile', pubkey))
  if (!res) return null
  return URL.createObjectURL(await res.blob())
}

export function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onloadend = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(blob)
  })
}

export function base64ToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

export async function storeListingImagesFromBase64(listingId, base64Array) {
  await Promise.all(base64Array.map(async (dataUrl, i) => {
    if (!dataUrl) return
    await storeListingImage(listingId, i, base64ToBlob(dataUrl))
  }))
}

export async function deleteListingImages(listingId, count = 5) {
  const cache = await getCache()
  await Promise.all(Array.from({ length: count }, (_, i) => cache.delete(key('listing', listingId, i))))
}
