export async function createCanvasFromImage(imageSrc, croppedAreaPixels, rotation = 0) {
  // Validate inputs
  if (!imageSrc || !croppedAreaPixels || typeof croppedAreaPixels.x !== 'number') {
    throw new Error('Invalid image source or crop area')
  }

  const image = await loadImage(imageSrc)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // Calculate rotated image dimensions
  const rotRad = (rotation * Math.PI) / 180
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation)

  // Set canvas size to the bounding box
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  // Translate canvas to center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)

  // Draw the image
  ctx.drawImage(image, 0, 0)

  // Create a new canvas for the cropped region
  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  croppedCanvas.width = croppedAreaPixels.width
  croppedCanvas.height = croppedAreaPixels.height

  // Draw the cropped portion
  croppedCtx.drawImage(
    canvas,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  )

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(blob => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create blob from cropped image'))
      }
    }, 'image/jpeg', 0.95)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function rotateSize(width, height, rotation) {
  const rotRad = (rotation * Math.PI) / 180
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height)
  }
}