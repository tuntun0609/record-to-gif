import GIF from 'gif.js'

export interface ImageWithDelay {
  id: string
  base64: string
  delay: number
}

interface GifOptions {
  width?: number
  height?: number
  quality?: number
  workerScript?: string
}

interface ExtendedGIF extends Omit<GIF, 'on'> {
  on(event: 'start' | 'abort', listener: () => void): this
  on(event: 'finished', listener: (blob: Blob, data: Uint8Array) => void): this
  on(event: 'progress', listener: (percent: number) => void): this
  on(event: 'error', listener: (error: Error) => void): this
}

class GifCreationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GifCreationError'
  }
}

async function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = base64
  })
}

function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  let width = img.width
  let height = img.height

  if (width > maxWidth) {
    height *= maxWidth / width
    width = maxWidth
  }

  if (height > maxHeight) {
    width *= maxHeight / height
    height = maxHeight
  }

  canvas.width = width
  canvas.height = height

  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

export async function createGif({
  images,
  onProgress,
  options = {},
  abortSignal,
}: {
  images: ImageWithDelay[]
  onProgress?: (percent: number) => void
  options?: GifOptions
  abortSignal?: AbortSignal
}): Promise<Blob> {
  if (images.length === 0) {
    throw new GifCreationError('No images provided')
  }

  const {
    width = 500,
    height = 500,
    quality = 10,
    workerScript = typeof window !== 'undefined' ? '/gif.worker.js' : undefined,
  } = options

  const gif = new GIF({
    workers: 2,
    quality,
    width,
    height,
    workerScript,
  }) as ExtendedGIF

  let aborted = false

  abortSignal?.addEventListener('abort', () => {
    aborted = true
    gif.abort()
  })

  return new Promise((resolve, reject) => {
    gif.on('progress', (percent: number) => {
      if (onProgress) {
        onProgress(percent)
      }
    })

    gif.on('finished', (blob: Blob) => {
      console.log('GIF creation completed')
      resolve(blob)
    })

    gif.on('error', error => {
      console.error('GIF generation error:', error)
      reject(new GifCreationError(`GIF generation error: ${error.message}`))
    })

    gif.on('abort', () => {
      console.warn('GIF generation aborted')
      reject(new GifCreationError('GIF generation aborted'))
    })

    const addFrames = async () => {
      for (let i = 0; i < images.length; i++) {
        if (aborted) {
          return
        }

        const { base64, delay } = images[i]
        try {
          console.log(`Processing image ${i + 1}/${images.length}`)
          const img = await loadImage(base64)
          const canvas = resizeImage(img, width, height)
          gif.addFrame(canvas, { delay })
        } catch (error) {
          console.error(`Error processing image ${i + 1}/${images.length}:`, error)
          reject(
            new GifCreationError(
              `Error processing image ${i + 1}/${images.length}: ${(error as Error).message}`
            )
          )
          return
        }
      }

      console.log('All frames added, rendering GIF...')
      gif.render()
    }

    addFrames().catch(error => {
      console.error('Error in addFrames:', error)
      reject(error)
    })
  })
}
