# 💍 WeddingSync

Una plataforma moderna para gestionar invitados, itinerarios y panoramas de una boda.

## Características

✅ **Calendario Interactivo** — Gestión visual de eventos durante toda la semana  
✅ **Hub de Vuelos** — Registro y agrupación de vuelos de invitados  
✅ **Panoramas Cartagena** — Catálogo votable de actividades turísticas  
✅ **Playlist Colaborativa** — Los invitados añaden sus canciones favoritas  
✅ **Dashboard Admin** — Vista completa para los novios  

## Stack

- **Next.js 14** (App Router)
- **React 18** 
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Base de datos + Auth)
- **Framer Motion** (Animaciones)
- **Vercel** (Deploy)

## Primeros Pasos

### 1. Clonar el repositorio

```bash
git clone https://github.com/alvaroarriagadao/WeddingSync.git
cd WeddingSync
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear un nuevo proyecto
3. Copiar `URL` y `anon key` de Project Settings → API
4. Crear archivo `.env.local`:

```bash
cp .env.example .env.local
```

5. Rellenar con tus credenciales de Supabase

### 4. Setup Supabase Schema

En la consola SQL de Supabase (SQL Editor), ejecutar el script SQL (ver QUICK_START.md).

### 5. Ejecutar servidor de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Estructura de Carpetas

```
/app
  /page.tsx                 # Landing page
  /login/page.tsx          # Login
  /dashboard               # Rutas admin
    /page.tsx
    /calendar/page.tsx
    /flights/page.tsx
    /panoramas/page.tsx
    /playlist/page.tsx
  /guest                   # Rutas invitados
    /page.tsx
    /calendar/page.tsx
    /flights/page.tsx
    /panoramas/page.tsx
    /playlist/page.tsx
  /layout.tsx
  /globals.css

/components
  /ui                      # Componentes reutilizables
  /calendar
  /flights
  /panoramas
  /playlist
  /landing

/lib
  /supabase.ts            # Cliente Supabase
  /auth.ts                # Lógica de autenticación
  /utils.ts               # Utilidades
```

## Variables de Entorno

```
NEXT_PUBLIC_SUPABASE_URL         # URL del proyecto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Anon key de Supabase
NEXT_PUBLIC_WEDDING_DATE         # Fecha de la boda (YYYY-MM-DD)
NEXT_PUBLIC_WEDDING_LOCATION     # Ubicación de la boda
NEXT_PUBLIC_BRIDE_NAME           # Nombre de la novia
NEXT_PUBLIC_GROOM_NAME           # Nombre del novio
NEXT_PUBLIC_ADMIN_CODE           # Código para acceso admin
```

## Deployment en Vercel

1. Push a GitHub
2. Ir a [vercel.com](https://vercel.com)
3. Importar repositorio
4. Añadir variables de entorno
5. Deploy ✨

## Licencia

MIT

---

**Hecho con ❤️ para una boda especial en Cartagena** 🌴
