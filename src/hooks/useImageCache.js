import { useMemo } from 'react'
import driveApi from '@/utils/driveApi.js'

export function useListingImages(listing) {
  return useMemo(() => {
    if (!listing?.images?.length) return []
    return listing.images.map(fileId => driveApi.constructor.imageUrl(fileId))
  }, [listing?.images?.join(',')])
}

export function useProfileImage(fileId) {
  if (!fileId) return null
  return driveApi.constructor.imageUrl(fileId)
}