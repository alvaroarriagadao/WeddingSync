import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'
import type { Uploader } from './uploader'

export const BUCKET = 'gallery'

/** Tope de subida del bucket en Supabase. */
export const MAX_FILE_BYTES = 30 * 1024 * 1024
export const MAX_FILE_LABEL = '30 MB'

/** Una foto pesada se reduce muchísimo al recomprimir, pero decodificar un
 *  archivo gigante puede tumbar el navegador del celular. */
const MAX_SOURCE_IMAGE_BYTES = 80 * 1024 * 1024

/** Las fotos se reescalan a este lado máximo antes de subir. */
const MAX_IMAGE_DIMENSION = 2200
const IMAGE_QUALITY = 0.85

/** Bajo este peso y tamaño no vale la pena recomprimir. */
const SKIP_COMPRESSION_BYTES = 900 * 1024

export type MediaItem = {
  id: string
  guest_id: string | null
  guest_name: string
  storage_path: string
  public_url: string
  kind: 'image' | 'video'
  mime_type: string | null
  size_bytes: number | null
  width: number | null
  height: number | null
  /** Primer cuadro del video, generado al subir. Null en las fotos. */
  poster_url: string | null
  caption: string | null
  created_at: string
}

/** Formatos que cualquier navegador abre y cualquiera puede descargar. */
const WEB_SAFE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']

function fileExt(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || ''
}

export function isHeic(file: File): boolean {
  return HEIC_TYPES.includes(file.type.toLowerCase()) || ['heic', 'heif'].includes(fileExt(file))
}

/**
 * Las fotos del iPhone llegan en HEIC y ni Android ni Windows las abren. El
 * decodificador pesa ~1 MB, así que se carga solo cuando aparece un HEIC.
 */
async function heicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any')
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  if (!blob || !blob.size) throw new Error('conversión vacía')
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
}

export function mediaKind(file: File): 'image' | 'video' | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  // Algunos Android entregan type vacío; caemos a la extensión.
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'm4v', 'webm', '3gp', 'avi', 'mkv'].includes(ext)) return 'video'
  return null
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatWhen(iso: string): string {
  const d = new Date(iso)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return 'recién'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffMin < 60 * 24) return `hace ${Math.floor(diffMin / 60)} h`
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // `imageOrientation` respeta el EXIF: sin esto las fotos verticales de iPhone
  // se suben acostadas.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch {
      /* formato no soportado (HEIC en algunos navegadores) → fallback */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No se pudo leer la imagen'))
      img.src = url
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}

type Prepared = { blob: Blob; mime: string; ext: string; width: number | null; height: number | null }

async function prepareImage(file: File): Promise<Prepared> {
  // Las fotos del iPhone llegan en HEIC: hay que convertirlas o la galería se
  // llena de archivos que medio mundo no puede abrir.
  let source = file
  if (isHeic(file)) {
    try {
      source = await heicToJpeg(file)
    } catch {
      throw new Error('No pudimos convertir esta foto HEIC. Compártela como JPG desde tu teléfono.')
    }
  }

  const asIs: Prepared = {
    blob: source,
    mime: source.type || 'image/jpeg',
    ext: source.name.split('.').pop()?.toLowerCase() || 'jpg',
    width: null,
    height: null,
  }

  // Los GIF pierden la animación al pasar por canvas.
  if (source.type === 'image/gif') return asIs

  let bitmap: ImageBitmap | HTMLImageElement | null = null
  try {
    bitmap = await loadBitmap(source)
  } catch {
    bitmap = null
  }

  const srcW = bitmap && 'width' in bitmap ? bitmap.width : 0
  const srcH = bitmap && 'height' in bitmap ? bitmap.height : 0

  if (!bitmap || !srcW || !srcH) {
    // Si el navegador no supo leerla, solo la subimos cuando el formato es uno
    // que igual se muestra en cualquier parte.
    if (WEB_SAFE_IMAGE_TYPES.includes(source.type)) return asIs
    throw new Error('No pudimos leer esta imagen. Súbela como JPG o PNG.')
  }

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(srcW, srcH))

  // Ya es chica y liviana: la subimos tal cual, pero con sus dimensiones reales.
  if (scale === 1 && source.size <= SKIP_COMPRESSION_BYTES && WEB_SAFE_IMAGE_TYPES.includes(source.type)) {
    return { ...asIs, width: srcW, height: srcH }
  }

  const width = Math.round(srcW * scale)
  const height = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ...asIs, width: srcW, height: srcH }
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height)
  if ('close' in bitmap) bitmap.close()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY)
  )
  if (!blob) return { ...asIs, width: srcW, height: srcH }

  // Si comprimir no ayudó (ya venía optimizada), nos quedamos con el original.
  if (blob.size >= source.size && scale === 1 && WEB_SAFE_IMAGE_TYPES.includes(source.type)) {
    return { ...asIs, width: srcW, height: srcH }
  }

  return { blob, mime: 'image/jpeg', ext: 'jpg', width, height }
}

type VideoInfo = { width: number | null; height: number | null; poster: Blob | null }

/**
 * Lee las dimensiones del video y captura su primer cuadro como portada: sin
 * ella el mosaico tendría que descargar cada video para mostrar algo.
 */
async function inspectVideo(file: File): Promise<VideoInfo> {
  const empty: VideoInfo = { width: null, height: null, poster: null }
  const url = URL.createObjectURL(file)

  try {
    return await new Promise<VideoInfo>(resolve => {
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      video.crossOrigin = 'anonymous'

      let settled = false
      const done = (value: VideoInfo) => { if (!settled) { settled = true; resolve(value) } }

      // Un archivo corrupto puede no emitir ningún evento.
      const timer = setTimeout(() => done(empty), 12_000)

      const capture = () => {
        clearTimeout(timer)
        const width = video.videoWidth || null
        const height = video.videoHeight || null
        if (!width || !height) return done(empty)

        try {
          const scale = Math.min(1, 1280 / Math.max(width, height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(width * scale)
          canvas.height = Math.round(height * scale)
          const ctx = canvas.getContext('2d')
          if (!ctx) return done({ width, height, poster: null })
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(blob => done({ width, height, poster: blob }), 'image/jpeg', 0.8)
        } catch {
          done({ width, height, poster: null })
        }
      }

      video.onloadeddata = () => {
        // El cuadro 0 suele venir negro; 0.1 s adentro ya hay imagen.
        const target = Math.min(0.1, (video.duration || 1) / 2)
        if (video.currentTime === target) return capture()
        video.onseeked = capture
        try { video.currentTime = target } catch { capture() }
      }
      video.onerror = () => { clearTimeout(timer); done(empty) }
      video.src = url
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 15_000)
  }
}

function randomName(ext: string): string {
  const stamp = new Date().toISOString().slice(0, 10)
  const rand = Math.random().toString(36).slice(2, 10)
  return `${stamp}/${Date.now()}-${rand}.${ext.replace(/[^a-z0-9]/gi, '') || 'bin'}`
}

/**
 * Sube el archivo por XHR en vez de `supabase.storage.upload` porque el SDK no
 * expone progreso, y sin barra real un video de 40 MB en datos móviles parece
 * colgado.
 */
function putObject(path: string, blob: Blob, mime: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('cache-control', 'max-age=31536000')
    if (mime) xhr.setRequestHeader('content-type', mime)

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      if (xhr.status === 413) return reject(new Error(`El archivo supera el límite de ${MAX_FILE_LABEL}`))
      reject(new Error('No se pudo subir el archivo'))
    }
    xhr.onerror = () => reject(new Error('Se cortó la conexión durante la subida'))
    xhr.onabort = () => reject(new Error('Subida cancelada'))
    xhr.send(blob)
  })
}

export async function uploadMedia(
  file: File,
  uploader: Uploader,
  onProgress: (pct: number) => void
): Promise<MediaItem> {
  const kind = mediaKind(file)
  if (!kind) throw new Error('Solo se permiten fotos y videos')

  // Los videos no se pueden achicar en el navegador, así que el tope se aplica
  // sobre el archivo original; las fotos recién después de recomprimirlas.
  if (kind === 'video' && file.size > MAX_FILE_BYTES) {
    throw new Error(
      `El video pesa ${formatBytes(file.size)} y el máximo es ${MAX_FILE_LABEL}. Sube un clip más corto.`
    )
  }
  if (kind === 'image' && file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error(`Esta foto pesa ${formatBytes(file.size)} y es demasiado grande para procesarla.`)
  }

  onProgress(0)

  let poster: Blob | null = null
  let prepared: Prepared

  if (kind === 'image') {
    prepared = await prepareImage(file)
  } else {
    const info = await inspectVideo(file)
    poster = info.poster
    prepared = {
      blob: file,
      mime: file.type || 'video/mp4',
      ext: file.name.split('.').pop()?.toLowerCase() || 'mp4',
      width: info.width,
      height: info.height,
    }
  }

  if (prepared.blob.size > MAX_FILE_BYTES) {
    throw new Error(
      `El archivo pesa ${formatBytes(prepared.blob.size)} y el máximo es ${MAX_FILE_LABEL}.`
    )
  }

  const path = randomName(prepared.ext)
  await putObject(path, prepared.blob, prepared.mime, onProgress)

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`

  // La portada es un extra: si falla, el video igual queda subido.
  let posterUrl: string | null = null
  if (poster) {
    const posterPath = `${path}.poster.jpg`
    try {
      await putObject(posterPath, poster, 'image/jpeg', () => {})
      posterUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${posterPath}`
    } catch {
      posterUrl = null
    }
  }

  const { data, error } = await supabase
    .from('media')
    .insert([{
      guest_id: uploader.guestId,
      guest_name: uploader.name,
      storage_path: path,
      public_url: publicUrl,
      kind,
      mime_type: prepared.mime,
      size_bytes: prepared.blob.size,
      width: prepared.width,
      height: prepared.height,
      poster_url: posterUrl,
    }])
    .select()
    .single()

  if (error || !data) {
    // No dejamos el archivo huérfano en el bucket si falla el registro.
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error('El archivo subió pero no se pudo guardar en la galería')
  }

  onProgress(100)
  return data as MediaItem
}

export async function deleteMedia(item: MediaItem): Promise<void> {
  const { error } = await supabase.from('media').delete().eq('id', item.id)
  if (error) throw new Error('No se pudo eliminar')
  const paths = [item.storage_path]
  if (item.poster_url) paths.push(`${item.storage_path}.poster.jpg`)
  await supabase.storage.from(BUCKET).remove(paths)
}

/* ————————————————— descargas ————————————————— */

function slug(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'invitado'
}

/** Nombre con el que el archivo llega al teléfono de quien lo descarga. */
export function downloadName(item: MediaItem, index?: number): string {
  const date = item.created_at.slice(0, 10)
  const ext = item.storage_path.split('.').pop()?.toLowerCase() || (item.kind === 'video' ? 'mp4' : 'jpg')
  const n = typeof index === 'number' ? `-${String(index + 1).padStart(3, '0')}` : ''
  return `boda-romina-felipe-${date}-${slug(item.guest_name)}${n}.${ext}`
}

/** `?download=` hace que Storage responda con Content-Disposition: attachment. */
export function downloadUrl(item: MediaItem): string {
  return `${item.public_url}?download=${encodeURIComponent(downloadName(item))}`
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/**
 * Empaqueta varios archivos en un .zip para bajar el álbum completo de una vez.
 * JSZip pesa, así que se carga solo cuando alguien lo pide.
 */
export async function downloadAllAsZip(
  items: MediaItem[],
  onProgress: (done: number, total: number) => void
): Promise<number> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  let done = 0
  let added = 0
  for (const [i, item] of items.entries()) {
    try {
      const res = await fetch(item.public_url)
      if (res.ok) {
        zip.file(downloadName(item, i), await res.blob())
        added++
      }
    } catch {
      // Un archivo que falle no debe tumbar la descarga completa.
    }
    done++
    onProgress(done, items.length)
  }

  if (added === 0) throw new Error('No se pudo descargar ningún archivo')

  const blob = await zip.generateAsync({ type: 'blob' })
  saveBlob(blob, `boda-romina-felipe-fotos-${new Date().toISOString().slice(0, 10)}.zip`)
  return added
}
