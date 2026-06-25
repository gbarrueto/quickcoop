# QCoop

QCoop es una app web para encontrar juegos a jugar con amigos. La app permite conectar bibliotecas de Steam, Epic Games y Game Pass, importar juegos manualmente, explorar recomendaciones y hacer matching con amigos.

## Stack

- Next.js 16 con App Router
- React 19
- TypeScript 5.7
- Tailwind CSS v4
- ESLint 9 con eslint-config-next
- Radix UI / shadcn/ui
- Vitest para tests básicos

## Funcionalidades

- Landing con onboarding rápido y conexión de cuentas.
- Importación manual de juegos.
- Vista de matching con juegos compartidos, filtros por categoría y compatibilidad de hardware.
- Recomendaciones basadas en la biblioteca del usuario.
- Tendencias multijugador con caché local y rutas API propias.
- Persistencia local del perfil de usuario en `localStorage`.

## Requisitos

- Node.js 22 o superior.
- pnpm 10 o compatible.
- Variables de entorno para las APIs externas.

## Variables de entorno

Se necesita un archivo `.env` con al menos lo siguiente:

```bash
STEAM_API_KEY=tu_clave_de_steam
EPIC_CLIENT_ID=tu_client_id_de_epic
EPIC_CLIENT_SECRET=tu_client_secret_de_epic
```

## Instalación

```bash
pnpm install
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
```

## Estructura principal

- `app/`: rutas de Next.js, páginas y route handlers.
- `components/`: UI y pantallas de landing/matching.
- `hooks/`: lógica de carga, autenticación y estado.
- `lib/`: helpers de API, matching, auth y persistencia.
- `tests/`: pruebas básicas de utilidades e integración ligera.

## Flujo general

1. La landing prepara el perfil local y las conexiones de plataformas.
2. `use-matching-init` carga datos de Steam, Epic y Game Pass.
3. La vista de matching cruza la biblioteca propia con la de amigos.
4. Se aplican filtros, compatibilidad de requisitos y recomendaciones.

## Notas

- La app no usa una sesión backend tradicional; el estado principal vive en el navegador.
- Las rutas `app/api/**` actúan como capa de servidor para hablar con Steam y Epic sin exponer secretos al cliente.
- Los tests actuales cubren utilidades puras y una carga de datos de matching con mocks.