'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { AppUser } from '@/lib/auth'
import {
  MAX_FILE_LABEL,
  deleteMedia,
  downloadAllAsZip,
  downloadUrl,
  formatBytes,
  formatWhen,
  mediaKind,
  uploadMedia,
  type MediaItem,
} from '@/lib/media'
import {
  getStoredUploader,
  isValidCode,
  storeUploader,
  type Uploader,
} from '@/lib/uploader'

type QueueItem = {
  key: string
  name: string
  previewUrl: string
  kind: 'image' | 'video'
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

type KindFilter = 'all' | 'image' | 'video'

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'image', label: 'Fotos' },
  { id: 'video', label: 'Videos' },
]

/* ————————————————— iconos ————————————————— */

function Icon({ path, className = 'w-5 h-5' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={path} />
    </svg>
  )
}

const PATH = {
  image: 'M3 16.5l5.2-5.2a2 2 0 012.8 0l4.5 4.5m-1.5-1.5l1.7-1.7a2 2 0 012.8 0L21 14.5M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z',
  video: 'M15 10l4.5-2.6v9.2L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z',
  camera: 'M3 8.5A1.5 1.5 0 014.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0121 8.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5v-9zM12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  upload: 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 17v1.5A2.5 2.5 0 006.5 21h11a2.5 2.5 0 002.5-2.5V17',
  close: 'M6 6l12 12M18 6L6 18',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 001 1h10a1 1 0 001-1l1-13M9 7V4h6v3',
  download: 'M12 4v12m0 0l-4.5-4.5M12 16l4.5-4.5M4 20h16',
  play: 'M8 5.5v13l11-6.5-11-6.5z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z',
  lock: 'M7 10V7a5 5 0 0110 0v3M5.5 10h13a1 1 0 011 1v9a1 1 0 01-1 1h-13a1 1 0 01-1-1v-9a1 1 0 011-1z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20c.9-3.3 3.8-5 7.5-5s6.6 1.7 7.5 5',
}

/* ————————————————— portón: nombre + código ————————————————— */

function AccessGate({ onReady }: { onReady: (u: Uploader) => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Escribe tu nombre')
    if (!isValidCode(code)) return setError('Ese no es el código de la boda')
    const uploader: Uploader = { name: name.trim(), guestId: null }
    storeUploader(uploader)
    onReady(uploader)
  }

  const field = 'w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3.5 font-guest text-base text-white placeholder-white/35 outline-none transition-colors focus:border-amber-300/60'

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0908] px-5">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/hero.jpg)', filter: 'blur(5px) brightness(0.28)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/50 to-stone-950/85" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-wedding-coral to-wedding-gold text-white shadow-lg shadow-black/30">
            <Icon path={PATH.lock} className="h-5 w-5" />
          </span>
          <p className="font-guest text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200/70">
            Romina &amp; Felipe
          </p>
          <h1 className="mt-3 font-guest-serif text-3xl leading-tight text-white">
            La galería de la boda
          </h1>
          <p className="mx-auto mt-3 max-w-xs font-guest text-sm leading-relaxed text-white/50">
            Es privada: escribe tu nombre y el código que te compartimos para ver y subir fotos.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className={field}
            placeholder="Tu nombre"
            value={name}
            autoComplete="name"
            onChange={e => { setName(e.target.value); setError('') }}
          />
          <input
            className={`${field} tracking-wide`}
            placeholder="Código de la boda"
            value={code}
            autoCapitalize="characters"
            onChange={e => { setCode(e.target.value); setError('') }}
          />

          {error && <p className="font-guest text-sm text-red-300/90">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-br from-amber-200 to-amber-400/95 py-4 font-guest text-sm font-bold uppercase tracking-[0.14em] text-stone-900 transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            Entrar a la galería
          </button>
        </form>

        <p className="mt-8 text-center font-guest text-xs text-white/25">
          ¿No tienes el código? Pídeselo a los novios
        </p>
      </motion.div>
    </main>
  )
}

/* ————————————————— tarjeta de subida ————————————————— */

function Uploader_({ onFiles, busy, compact, uploaderName }: {
  onFiles: (files: FileList | null) => void
  busy: boolean
  /** Con la galería ya llena, el formulario grande empuja las fotos fuera de
   *  pantalla: ahí se colapsa a una barra. */
  compact: boolean
  uploaderName: string | null
}) {
  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const inputs = (
    <>
      <input
        ref={galleryInput}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={e => { onFiles(e.target.files); e.target.value = '' }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { onFiles(e.target.files); e.target.value = '' }}
      />
    </>
  )

  if (compact) {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
        className={`flex flex-col gap-3 rounded-2xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:pl-5 ${
          dragging ? 'border-wedding-coral bg-wedding-coral/[0.06]' : 'border-transparent bg-white shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3 px-1 sm:px-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-wedding-coral to-wedding-gold text-white">
            <Icon path={PATH.upload} className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="font-guest text-sm font-semibold text-wedding-dark">
              {uploaderName ? `Suma tus fotos, ${uploaderName.split(' ')[0]}` : 'Suma tus fotos y videos'}
            </p>
            <p className="font-guest text-xs text-wedding-dark/45">
              Varios a la vez · hasta {MAX_FILE_LABEL} cada uno
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryInput.current?.click()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-wedding-coral px-5 py-3 font-guest text-sm font-semibold text-white transition-all hover:bg-wedding-coral/90 active:scale-[0.98] disabled:opacity-50 sm:flex-none"
          >
            <Icon path={PATH.image} className="h-[17px] w-[17px]" />
            Subir
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraInput.current?.click()}
            aria-label="Tomar una foto"
            className="inline-flex items-center justify-center rounded-xl border border-wedding-dark/10 px-4 py-3 text-wedding-dark/60 transition-all hover:border-wedding-coral/40 hover:text-wedding-coral active:scale-[0.98] disabled:opacity-50"
          >
            <Icon path={PATH.camera} className="h-[18px] w-[18px]" />
          </button>
        </div>
        {inputs}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
      className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-colors duration-300 ${
        dragging ? 'border-wedding-coral bg-wedding-coral/[0.06]' : 'border-wedding-coral/25 bg-white'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none opacity-[0.55] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(201,123,107,0.10),transparent_70%)]" />

      <div className="relative px-5 py-8 sm:px-10 sm:py-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-wedding-coral to-wedding-gold text-white shadow-lg shadow-wedding-coral/25">
          <Icon path={PATH.upload} className="h-6 w-6" />
        </div>

        <h2 className="font-guest-serif text-2xl sm:text-3xl text-wedding-dark">Sube tus fotos y videos</h2>
        <p className="mt-2 font-guest text-sm text-wedding-dark/55 max-w-sm mx-auto leading-relaxed">
          Elige varios a la vez desde tu galería. Los verán todos los invitados al instante.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            disabled={busy}
            onClick={() => galleryInput.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-wedding-coral px-6 py-3.5 font-guest text-sm font-semibold text-white shadow-sm transition-all hover:bg-wedding-coral/90 active:scale-[0.98] disabled:opacity-50"
          >
            <Icon path={PATH.image} className="h-[18px] w-[18px]" />
            Elegir de mi galería
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraInput.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-wedding-dark/12 bg-white px-6 py-3.5 font-guest text-sm font-semibold text-wedding-dark/75 transition-all hover:border-wedding-coral/40 hover:text-wedding-coral active:scale-[0.98] disabled:opacity-50"
          >
            <Icon path={PATH.camera} className="h-[18px] w-[18px]" />
            Tomar una foto
          </button>
        </div>

        <p className="mt-4 font-guest text-xs text-wedding-dark/35">
          Fotos y videos cortos · hasta {MAX_FILE_LABEL} cada uno
        </p>

        {inputs}
      </div>
    </motion.div>
  )
}

/* ————————————————— tile del mosaico ————————————————— */

function Tile({ item, index, onOpen }: { item: MediaItem; index: number; onOpen: () => void }) {
  const [hover, setHover] = useState(false)
  const [broken, setBroken] = useState(false)
  const ratio = item.width && item.height ? item.width / item.height : 4 / 5
  const still = item.kind === 'image' ? item.public_url : item.poster_url

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.03 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-wedding-dark/5 shadow-sm ring-1 ring-black/[0.04] transition-shadow duration-300 hover:shadow-xl hover:shadow-black/10 sm:mb-4"
      style={{ aspectRatio: String(ratio) }}
    >
      {still && !broken && (
        <img
          src={still}
          alt={item.kind === 'image' ? `Foto de ${item.guest_name}` : `Video de ${item.guest_name}`}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      )}

      {/* Un archivo que el navegador no puede mostrar no debe verse como un
          ícono roto. */}
      {broken && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-wedding-sand px-3 text-center text-wedding-dark/35">
          <Icon path={PATH.image} className="h-6 w-6" />
          <span className="font-guest text-[11px] leading-tight">No se pudo mostrar</span>
        </div>
      )}

      {/* El video solo se descarga al pasar el mouse (o si no hubo portada). */}
      {item.kind === 'video' && (hover || !still) && !broken && (
        <video
          src={item.public_url}
          muted
          loop
          autoPlay={hover}
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {item.kind === 'video' && (
        <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          <Icon path={PATH.play} className="h-3.5 w-3.5 translate-x-[1px]" />
        </span>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 text-left opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <p className="truncate font-guest text-xs font-semibold text-white drop-shadow">{item.guest_name}</p>
        <p className="font-guest text-[11px] text-white/70">{formatWhen(item.created_at)}</p>
      </div>
    </motion.button>
  )
}

/* ————————————————— lightbox ————————————————— */

function Lightbox({
  items, index, onClose, onNavigate, canDelete, onDelete,
}: {
  items: MediaItem[]
  index: number
  onClose: () => void
  onNavigate: (next: number) => void
  canDelete: (item: MediaItem) => boolean
  onDelete: (item: MediaItem) => void
}) {
  const item = items[index]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNavigate(index + 1)
      if (e.key === 'ArrowLeft') onNavigate(index - 1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [index, onClose, onNavigate])

  if (!item) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* barra superior */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6" onClick={e => e.stopPropagation()}>
        <span className="font-guest text-xs text-white/50 tabular-nums">{index + 1} / {items.length}</span>
        <div className="flex items-center gap-1">
          {canDelete(item) && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-full p-2.5 text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-300"
              aria-label="Eliminar"
            >
              <Icon path={PATH.trash} className="h-[18px] w-[18px]" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <Icon path={PATH.close} className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* contenido */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onClick={e => e.stopPropagation()}>
        {index > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(index - 1)}
            className="absolute left-1 z-10 hidden rounded-full bg-white/10 p-3 text-white/80 backdrop-blur-sm transition hover:bg-white/20 sm:block"
            aria-label="Anterior"
          >
            <Icon path={PATH.left} />
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) onNavigate(index + 1)
              else if (info.offset.x > 70) onNavigate(index - 1)
            }}
            className="flex max-h-full w-full items-center justify-center"
          >
            {item.kind === 'image' ? (
              <img
                src={item.public_url}
                alt={`Foto de ${item.guest_name}`}
                draggable={false}
                className="max-h-[62vh] w-auto max-w-full rounded-lg object-contain shadow-2xl sm:max-h-[68vh]"
              />
            ) : (
              <video
                src={item.public_url}
                controls
                autoPlay
                playsInline
                className="max-h-[62vh] w-auto max-w-full rounded-lg shadow-2xl sm:max-h-[68vh]"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {index < items.length - 1 && (
          <button
            type="button"
            onClick={() => onNavigate(index + 1)}
            className="absolute right-1 z-10 hidden rounded-full bg-white/10 p-3 text-white/80 backdrop-blur-sm transition hover:bg-white/20 sm:block"
            aria-label="Siguiente"
          >
            <Icon path={PATH.right} />
          </button>
        )}
      </div>

      {/* pie con la descarga bien a mano */}
      <div className="shrink-0 px-5 py-5 text-center sm:py-6" onClick={e => e.stopPropagation()}>
        <a
          href={downloadUrl(item)}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mb-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 font-guest text-sm font-bold text-stone-900 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          <Icon path={PATH.download} className="h-[18px] w-[18px]" />
          Descargar {item.kind === 'video' ? 'video' : 'foto'}
        </a>
        <p className="font-guest-serif text-lg text-white">{item.guest_name}</p>
        <p className="font-guest text-xs text-white/45">
          {formatWhen(item.created_at)}
          {item.size_bytes ? ` · ${formatBytes(item.size_bytes)}` : ''}
        </p>
        <p className="mt-2 font-guest text-[11px] text-white/25 sm:hidden">Desliza para ver más</p>
      </div>
    </motion.div>
  )
}

/* ————————————————— galería ————————————————— */

export default function MediaGallery({ user }: { user: AppUser | null }) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [kind, setKind] = useState<KindFilter>('all')
  const [who, setWho] = useState<string>('all')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [uploader, setUploader] = useState<Uploader | null>(null)
  const [identityReady, setIdentityReady] = useState(false)
  const [zipping, setZipping] = useState<{ done: number; total: number } | null>(null)
  const uploading = queue.some(q => q.status === 'uploading')

  // Quien entró con su cuenta ya está identificado; el resto pasa por el código.
  useEffect(() => {
    if (user) {
      setUploader({ name: user.name, guestId: user.id })
      storeUploader({ name: user.name, guestId: user.id })
    } else {
      setUploader(getStoredUploader())
    }
    setIdentityReady(true)
  }, [user])

  const unlocked = !!uploader

  const load = useCallback(async () => {
    if (!unlocked) return
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setItems(data as MediaItem[])
    setLoading(false)
  }, [unlocked])

  useEffect(() => { load() }, [load])

  // Las fotos de otros invitados aparecen solas, sin recargar.
  useEffect(() => {
    if (!unlocked) return
    const channel = supabase
      .channel('media-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'media' }, payload => {
        const fresh = payload.new as MediaItem
        setItems(prev => (prev.some(i => i.id === fresh.id) ? prev : [fresh, ...prev]))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'media' }, payload => {
        setItems(prev => prev.filter(i => i.id !== (payload.old as MediaItem).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [unlocked])

  const startUploads = useCallback(async (files: File[], who: Uploader) => {
    const entries: QueueItem[] = files.map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      kind: mediaKind(file) as 'image' | 'video',
      progress: 0,
      status: 'uploading',
    }))
    setQueue(prev => [...prev, ...entries])

    const patch = (key: string, changes: Partial<QueueItem>) =>
      setQueue(prev => prev.map(q => (q.key === key ? { ...q, ...changes } : q)))

    let ok = 0
    // En serie: subir cinco archivos en paralelo desde un celular satura la conexión.
    for (let i = 0; i < files.length; i++) {
      const entry = entries[i]
      try {
        const saved = await uploadMedia(files[i], who, pct => patch(entry.key, { progress: pct }))
        patch(entry.key, { status: 'done', progress: 100 })
        setItems(prev => (prev.some(p => p.id === saved.id) ? prev : [saved, ...prev]))
        ok++
      } catch (err: any) {
        patch(entry.key, { status: 'error', error: err?.message || 'Error al subir' })
      }
    }

    if (ok > 0) toast.success(ok === 1 ? '¡Subida! Gracias 💛' : `¡${ok} archivos subidos! Gracias 💛`)

    // Las tarjetas con error quedan a la vista; las exitosas se van solas.
    setTimeout(() => {
      setQueue(prev => {
        prev.forEach(q => { if (q.status === 'done') URL.revokeObjectURL(q.previewUrl) })
        return prev.filter(q => q.status !== 'done')
      })
    }, 1600)
  }, [])

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)

    const accepted = files.filter(f => mediaKind(f) !== null)
    if (accepted.length < files.length) toast.error('Algunos archivos no son fotos ni videos')
    if (accepted.length === 0) return

    if (!uploader) return
    startUploads(accepted, uploader)
  }, [uploader, startUploads])

  const isMine = useCallback(
    (item: MediaItem) =>
      (!!user && item.guest_id === user.id) ||
      (!!uploader && item.guest_name.toLowerCase() === uploader.name.toLowerCase()),
    [user, uploader]
  )

  const canDelete = useCallback(
    (item: MediaItem) => user?.role === 'admin' || isMine(item),
    [user, isMine]
  )

  const handleDelete = useCallback(async (item: MediaItem) => {
    if (!window.confirm('¿Eliminar este recuerdo?')) return
    const snapshot = items
    setItems(prev => prev.filter(i => i.id !== item.id))
    setLightbox(null)
    try {
      await deleteMedia(item)
      toast.success('Eliminado')
    } catch {
      setItems(snapshot)
      toast.error('No se pudo eliminar')
    }
  }, [items])

  /** Cada invitado con su conteo, el más activo primero. */
  const people = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach(i => counts.set(i.guest_name, (counts.get(i.guest_name) || 0) + 1))
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [items])

  const visible = useMemo(() => {
    return items.filter(i => {
      if (kind !== 'all' && i.kind !== kind) return false
      if (who === 'all') return true
      if (who === '__mine__') return isMine(i)
      return i.guest_name === who
    })
  }, [items, kind, who, isMine])

  const counts = useMemo(() => ({
    all: items.length,
    image: items.filter(i => i.kind === 'image').length,
    video: items.filter(i => i.kind === 'video').length,
  }), [items])

  const navigate = useCallback((next: number) => {
    setLightbox(current => {
      if (current === null) return null
      if (next < 0 || next >= visible.length) return current
      return next
    })
  }, [visible.length])

  const handleZip = useCallback(async () => {
    if (zipping || visible.length === 0) return
    setZipping({ done: 0, total: visible.length })
    try {
      const n = await downloadAllAsZip(visible, (done, total) => setZipping({ done, total }))
      toast.success(`${n} archivos listos para guardar`)
    } catch {
      toast.error('No se pudo armar la descarga')
    } finally {
      setZipping(null)
    }
  }, [visible, zipping])

  const myCount = useMemo(() => items.filter(isMine).length, [items, isMine])

  // Evita el parpadeo del portón mientras se lee el localStorage.
  if (!identityReady) return <main className="min-h-screen bg-wedding-sand" />
  if (!unlocked) return <AccessGate onReady={setUploader} />

  return (
    <main className="min-h-screen bg-wedding-sand font-guest">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.header initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <p className="mb-2 flex items-center gap-1.5 font-guest text-[11px] font-semibold uppercase tracking-[0.3em] text-wedding-coral">
            <Icon path={PATH.sparkle} className="h-3.5 w-3.5" />
            Recuerdos
          </p>
          <h1 className="font-guest-serif text-3xl tracking-wide text-wedding-dark sm:text-4xl">
            La galería de todos
          </h1>
          <p className="mt-2 max-w-xl font-guest text-sm leading-relaxed text-wedding-dark/55">
            Romina &amp; Felipe · Cartagena de Indias. Mira, descarga y suma tus
            recuerdos de la semana.
          </p>
        </motion.header>

        <Uploader_
          onFiles={handleFiles}
          busy={uploading}
          compact={items.length > 0}
          uploaderName={uploader?.name ?? null}
        />

        {/* cola de subida */}
        <AnimatePresence>
          {queue.length > 0 && (
            <motion.div
              key="upload-queue"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2 overflow-hidden"
            >
              {queue.map(q => (
                <div key={q.key} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-wedding-sand">
                    {q.kind === 'image'
                      ? <img src={q.previewUrl} alt="" className="h-full w-full object-cover" />
                      : <video src={`${q.previewUrl}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-guest text-xs font-medium text-wedding-dark/80">{q.name}</p>
                    {q.status === 'error' ? (
                      <p className="mt-0.5 font-guest text-[11px] leading-snug text-red-500">{q.error}</p>
                    ) : (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-wedding-sand">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-wedding-coral to-wedding-gold"
                          animate={{ width: `${q.progress}%` }}
                          transition={{ duration: 0.25 }}
                        />
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 font-guest text-[11px] tabular-nums text-wedding-dark/40">
                    {q.status === 'done' ? '✓' : q.status === 'error' ? '!' : `${q.progress}%`}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* filtros + descarga masiva */}
        {items.length > 0 && (
          <div className="mt-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {KIND_FILTERS.map(f => {
                if (f.id !== 'all' && counts[f.id] === 0) return null
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => { setKind(f.id); setLightbox(null) }}
                    className={`rounded-full px-4 py-2 font-guest text-xs font-semibold transition-all ${
                      kind === f.id ? 'bg-wedding-dark text-white shadow-sm' : 'bg-white text-wedding-dark/55 hover:text-wedding-dark'
                    }`}
                  >
                    {f.label}
                    <span className={kind === f.id ? 'ml-1.5 text-white/50' : 'ml-1.5 text-wedding-dark/30'}>
                      {counts[f.id]}
                    </span>
                  </button>
                )
              })}

              {myCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setWho(who === '__mine__' ? 'all' : '__mine__'); setLightbox(null) }}
                  className={`rounded-full px-4 py-2 font-guest text-xs font-semibold transition-all ${
                    who === '__mine__' ? 'bg-wedding-coral text-white shadow-sm' : 'bg-white text-wedding-dark/55 hover:text-wedding-dark'
                  }`}
                >
                  Mías
                  <span className={who === '__mine__' ? 'ml-1.5 text-white/60' : 'ml-1.5 text-wedding-dark/30'}>{myCount}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm sm:max-w-xs">
                <Icon path={PATH.user} className="h-4 w-4 shrink-0 text-wedding-dark/35" />
                <select
                  value={who === '__mine__' ? 'all' : who}
                  onChange={e => { setWho(e.target.value); setLightbox(null) }}
                  className="min-w-0 flex-1 bg-transparent font-guest text-sm text-wedding-dark outline-none"
                >
                  <option value="all">Todos los invitados ({items.length})</option>
                  {people.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.count})</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleZip}
                disabled={!!zipping || visible.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-wedding-dark/10 bg-white px-4 py-2.5 font-guest text-sm font-semibold text-wedding-dark/70 shadow-sm transition-all hover:border-wedding-coral/40 hover:text-wedding-coral disabled:opacity-50"
              >
                <Icon path={PATH.download} className="h-4 w-4" />
                {zipping
                  ? `Preparando ${zipping.done}/${zipping.total}…`
                  : `Descargar ${visible.length === items.length ? 'todo' : 'esta selección'} (${visible.length})`}
              </button>
            </div>
          </div>
        )}

        {/* mosaico */}
        <div className="mt-5">
          {loading ? (
            <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
              {[0.8, 1.25, 1, 1.4, 0.9, 1.15, 1.3, 0.95].map((r, i) => (
                <div key={i} className="mb-3 animate-pulse break-inside-avoid rounded-2xl bg-wedding-dark/[0.06] sm:mb-4"
                  style={{ aspectRatio: String(r) }} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-3xl bg-white py-16 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-wedding-sand text-wedding-coral/50">
                <Icon path={kind === 'video' ? PATH.video : PATH.image} className="h-6 w-6" />
              </div>
              <p className="font-guest-serif text-lg text-wedding-dark/60">
                {items.length === 0 ? 'Todavía no hay recuerdos' : 'Nada por aquí todavía'}
              </p>
              <p className="mt-1 font-guest text-sm text-wedding-dark/40">
                {items.length === 0 ? '¡Sé el primero en subir una foto!' : 'Prueba con otro filtro'}
              </p>
              {items.length > 0 && (
                <button
                  onClick={() => { setKind('all'); setWho('all') }}
                  className="mt-3 font-guest text-sm text-wedding-coral hover:underline"
                >
                  Ver todo
                </button>
              )}
            </div>
          ) : (
            <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
              {visible.map((item, i) => (
                <Tile key={item.id} item={item} index={i} onOpen={() => setLightbox(i)} />
              ))}
            </div>
          )}
        </div>

        <p className="mt-10 text-center font-guest text-xs text-wedding-dark/30">
          Estás como <span className="text-wedding-dark/50">{uploader?.name}</span>
        </p>
      </div>

      <AnimatePresence>
        {lightbox !== null && visible[lightbox] && (
          <Lightbox
            key="lightbox"
            items={visible}
            index={lightbox}
            onClose={() => setLightbox(null)}
            onNavigate={navigate}
            canDelete={canDelete}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
