import { useState, useEffect } from 'react'
import { getListingImageUrls, getProfileImageUrl } from '@/db/cache.js'

export function useListingImages(listingId, count = 5) {
  const [urls, setUrls]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!listingId) return
    setLoading(true)
    getListingImageUrls(listingId, count)
      .then(setUrls)
      .finally(() => setLoading(false))
  }, [listingId, count])

  return { urls, loading }
}

export function useProfileImage(pubkey) {
  const [url, setUrl]         = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!pubkey) return
    getProfileImageUrl(pubkey)
      .then(setUrl)
      .finally(() => setLoading(false))
  }, [pubkey])

  return { url, loading }
}
