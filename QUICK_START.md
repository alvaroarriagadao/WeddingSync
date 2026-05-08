╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                   🎊 WEDDINGSYNC — ¡COMIENZA AQUÍ! 🎊                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝

## 5 PASOS PARA COMENZAR (15 minutos)

### PASO 1 — Clonar Repositorio (2 min)

```bash
git clone https://github.com/alvaroarriagadao/WeddingSync.git
cd WeddingSync
npm install
```

### PASO 2 — Crear Proyecto Supabase (5 min)

1. Ve a https://supabase.com → Sign Up (gratis)
2. Click "New Project"
3. Nombre: `weddingsync`
4. Espera a que se inicialice (2-3 min)
5. Ve a Project Settings → API
6. Copia Project URL y anon public key

### PASO 3 — Configurar .env.local (1 min)

Copia .env.example a .env.local y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_WEDDING_DATE=2025-09-15
NEXT_PUBLIC_WEDDING_LOCATION=Cartagena de Indias, Colombia
NEXT_PUBLIC_BRIDE_NAME=Novia
NEXT_PUBLIC_GROOM_NAME=Novio
NEXT_PUBLIC_ADMIN_CODE=ADMIN2025
```

### PASO 4 — Crear Base de Datos (5 min)

En Supabase, ve a SQL Editor y ejecuta:

```sql
-- Tabla de invitados
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  code_used VARCHAR NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de eventos
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR CHECK (category IN ('ceremony', 'dinner', 'activity', 'transfer', 'party')),
  badge_type VARCHAR CHECK (badge_type IN ('required', 'optional', 'admin_only')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES guests(id) ON DELETE CASCADE
);

-- Tabla de confirmaciones de eventos
CREATE TABLE event_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL,
  event_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE(guest_id, event_id)
);

-- Tabla de vuelos
CREATE TABLE flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL,
  flight_type VARCHAR CHECK (flight_type IN ('arrival', 'departure')),
  flight_number VARCHAR NOT NULL,
  origin_airport VARCHAR,
  datetime TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

-- Tabla de atracciones
CREATE TABLE attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  image_url VARCHAR,
  price_cop DECIMAL,
  price_usd DECIMAL,
  duration_hours DECIMAL,
  activity_level VARCHAR CHECK (activity_level IN ('low', 'medium', 'high')),
  day_suggestion INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de votos de atracciones
CREATE TABLE attraction_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL,
  attraction_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
  FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE,
  UNIQUE(guest_id, attraction_id)
);

-- Tabla de playlist
CREATE TABLE playlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL,
  artist VARCHAR NOT NULL,
  song VARCHAR NOT NULL,
  spotify_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_flights_guest ON flights(guest_id);
CREATE INDEX idx_event_confirmations_guest ON event_confirmations(guest_id);
CREATE INDEX idx_attraction_votes_guest ON attraction_votes(guest_id);
CREATE INDEX idx_playlist_guest ON playlist(guest_id);
```

### PASO 5 — Verificar que Funciona (1 min)

```bash
npm run dev
```

Abre http://localhost:3000 y verifica:
- ✓ Landing page funciona
- ✓ Login invitado: BODA2025
- ✓ Login novios: ADMIN2025

## 🚀 Siguiente: Abrir en Claude Code

1. Ve a claude.ai
2. Click derecha → "Claude Code"
3. Abre la carpeta WeddingSync
4. Pega el PROMPT MASTER (abajo)
5. ¡COMIENZA A CONSTRUIR! 🎊

## 📋 PROMPT MASTER PARA CLAUDE CODE

```
Quiero construir una webapp llamada **WeddingSync** para una boda específica.
Es un proyecto de uso único, para ~30 invitados que viajan desde Chile a
Cartagena de Indias, Colombia. La boda es el 15 de Septiembre de 2025.
Los invitados estarán aproximadamente una semana.

## Stack
- Next.js 14 (App Router)
- Tailwind CSS
- Supabase (auth simple + base de datos)
- Deploy en Vercel (free tier)
- Framer Motion para animaciones
- shadcn/ui para componentes base

## Roles
Hay DOS tipos de usuario:
1. **Novios (admin):** acceden con un código secreto. Pueden crear/editar
   eventos del calendario, ver dashboard de vuelos, ver ranking de panoramas
   y votos, gestionar la playlist.
2. **Invitado:** accede con su nombre + código de invitación "BODA2025".
   Puede ver el calendario, registrar su vuelo, votar panoramas,
   y añadir canciones a la playlist.

## MÓDULO 1 — Landing Page
Página de entrada visualmente impactante:
- Hero con foto de Cartagena de fondo (placeholder), nombres de los novios,
  cuenta regresiva animada hasta el 15 Sep 2025
- Paleta de colores: arena, coral suave, dorado, blanco roto
  (estética caribeña elegante)
- Tipografía: serif elegante para títulos, sans-serif limpio para cuerpo
- Botón CTA: "Soy invitado / Soy los novios"
- Sección de bienvenida con texto personalizable por los novios

## MÓDULO 2 — Calendario de la semana (UI/UX PRIORITARIO)
Vista semanal visual tipo "resort itinerary":
- Rango: se configura con fechas de inicio/fin (ej. 12-19 Sep)
- Cada día tiene una línea de tiempo con eventos
- Cada evento tiene:
  - Título, hora inicio/fin, lugar, descripción
  - Categoría con ícono y color:
    🎊 Ceremonia (dorado)
    🍽️ Cena/Comida (coral)
    🏖️ Actividad libre (turquesa)
    🚌 Traslado (gris)
    🎉 Fiesta (violeta)
  - Badge: "Todos van" / "Opcional" / "Solo novios"
  - Contador de confirmados
  - Botón "Me apunto" para invitados

VISTA ADMIN: Los novios pueden arrastrar y soltar eventos, crear nuevos
con un modal bonito, editar inline. Muy intuitivo, como Notion o
Google Calendar pero más visual.

VISTA INVITADO: Solo lectura con su propio estado de confirmación
por evento. Vista mobile-first muy clara.

## MÓDULO 3 — Hub de Vuelos
Los invitados registran opcionalmente:
- Nombre completo
- Vuelo de llegada: número de vuelo, aeropuerto origen, fecha y hora de llegada
- Vuelo de regreso: número de vuelo, fecha y hora de salida

VISTA INVITADO: Ve con quién comparte vuelo o franja de llegada.
Mensaje tipo "🛬 Llegas junto a Javiera M. y Rodrigo P."

VISTA ADMIN (dashboard): 
- Grupos de llegada agrupados por franja horaria (cada 2 horas)
- Grupos de regreso igual
- Exportar como CSV
- Ver quién NO ha registrado vuelo todavía

## MÓDULO 4 — Panoramas Cartagena
15 tarjetas de actividades/panoramas en Cartagena de Indias:
1. Ciudad Amurallada walking tour
2. Islas del Rosario snorkel
3. Playa Blanca
4. Atardecer en Café del Mar
5. Tour en chiva rumbera nocturna
6. Museo del Oro Zenú
7. Barrio Getsemaní street art tour
8. Castillo San Felipe de Barajas
9. Cena en restaurante La Vitrola
10. Mercado de Bazurto
11. Kayak en manglares
12. Clase de cocina cartagenera
13. Tour en lancha al atardecer
14. Spa y día de relax
15. Salsa y coctelería

Cada tarjeta tiene botón ❤️ "Me encanta" para votar.

VISTA ADMIN: Ranking en tiempo real de los más votados.

## MÓDULO 5 — Playlist Colaborativa
- Campo para pegar link de Spotify o escribir "Artista - Canción"
- Lista de canciones con nombre del que las añadió
- Novios pueden eliminar canciones
- Estética vinilo/cassette

## BASE DE DATOS
Ya está creada en Supabase. Las tablas: guests, events, event_confirmations,
flights, attractions, attraction_votes, playlist

## DISEÑO GENERAL
- Mobile-first, completamente responsivo
- Paleta: #F5E6D3 (arena), #E8927C (coral), #C9A84C (dorado),
  #7EC8C8 (turquesa caribeña), #FFFFFF, #2C2C2C
- Fuentes: Playfair Display (títulos) + Inter (cuerpo)
- Animaciones suaves con Framer Motion

## POR DÓNDE EMPEZAR
1. Mejorar Landing Page (hero, countdown animado)
2. Construir Calendario (PRIORIDAD - vista semanal con timeline)
3. Hub de Vuelos
4. Panoramas
5. Playlist

¡Comencemos por la Landing y el Calendario!
```

---

¡Listo! El repositorio está en https://github.com/alvaroarriagadao/WeddingSync
