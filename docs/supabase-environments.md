# Entornos de Supabase (develop / production)

QuickCoop usa **dos proyectos Supabase separados**, no un solo proyecto con esquemas o
branches. Las migraciones en [`supabase/migrations/`](../supabase/migrations/) son la
única fuente de verdad del esquema y se aplican a ambos proyectos **en el mismo orden**.

## Proyectos

| Entorno | Nombre en Supabase | Project ref | Región | Env file local |
|---|---|---|---|---|
| Develop | `qcoop develop` | `qocncrtszpfiocdsdezb` | us-east-1 | `.env.local` |
| Production | `qcoop production` | `luhihyyxmplwyfuijsrh` | us-west-2 | `.env.prod.local` |

Ambos viven en la misma organización (`rzwpyjyenwbwnlpfqift`). Los `.env*.local` están
en `.gitignore`: cada entorno (local dev, Vercel preview, Vercel production) define sus
propias env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y
para el backend `SUPABASE_SERVICE_ROLE_KEY` / `TOKEN_ENCRYPTION_KEY`) apuntando al
proyecto correspondiente — nunca se comparte la misma key entre develop y production.

El proyecto de producción puede aparecer como `INACTIVE` en `supabase projects list`
(auto-pausa de Supabase en proyectos sin tráfico) — hay que reactivarlo desde el
dashboard antes del primer push.

## Flujo de trabajo

El CLI local queda **linkeado a develop por defecto** (`supabase link --project-ref
qocncrtszpfiocdsdezb`, ya hecho). Todo el desarrollo del día a día apunta a develop.

1. **Crear la migración**: `supabase migration new <nombre>`, escribir el SQL.
2. **Aplicar y probar en develop**: `supabase db push --linked` (con el link en
   develop). Verificar con `supabase migration list --linked` y `supabase db advisors
   --linked`, y probar la app contra `.env.local`.
3. **Solo una vez verificado en develop**, promover a producción:
   ```bash
   supabase link --project-ref luhihyyxmplwyfuijsrh
   supabase db push --linked
   ```
4. **Volver a dejar el CLI en develop** para que el trabajo normal no apunte por
   accidente a producción:
   ```bash
   supabase link --project-ref qocncrtszpfiocdsdezb
   ```

## Reglas

- **Nunca** escribir SQL ad-hoc directo contra producción (ni desde el SQL editor del
  dashboard) — todo cambio de esquema pasa por una migración versionada, aplicada
  primero en develop.
- **Nunca** editar una migración ya aplicada en algún entorno; si hay que corregir algo,
  se crea una migración nueva.
- El historial de migraciones debe quedar **idéntico** en ambos proyectos (mismo set de
  timestamps aplicados) — `supabase migration list --linked` en cada uno para
  confirmarlo antes de dar por cerrada una promoción a prod.
- Mientras no exista CI, la promoción a producción es manual y deliberada (pasos 3-4
  arriba), nunca automática al mergear a una rama.
