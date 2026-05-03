import imageCompression from 'browser-image-compression'

const LISTING_OPTS = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.8 }
const PROFILE_OPTS = { maxSizeMB: 0.2, maxWidthOrHeight: 400,  useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.85 }

export const compressListingImage = file => imageCompression(file, LISTING_OPTS).catch(() => file)
export const compressProfileImage = file => imageCompression(file, PROFILE_OPTS).catch(() => file)

export async function processListingImages(files) {
  return Promise.all(Array.from(files).slice(0, 5).map(async file => {
    const blob = await compressListingImage(file)
    return { blob, previewUrl: URL.createObjectURL(blob) }
  }))
}

export const isValidImageFile = file => ['image/jpeg','image/png','image/webp','image/heic'].includes(file.type)
export const formatFileSize = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`
