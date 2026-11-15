# Yupi! · Finanzas personales

App de finanzas personales en soles (PEN) para controlar gastos, evitar compras por impulso y saber cuánto dinero puedes gastar de verdad.

Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, shadcn/ui (Base UI), Clerk (autenticación), Neon Postgres con Drizzle ORM, Zod, TanStack Query y Vitest.

## Empezar

Requisitos: Node.js 20.9 o superior.

```bash
npm install
cp .env.example .env.local   # completa los valores
npm run db:migrate           # aplica las migraciones a la base de DATABASE_URL
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (incluye el chequeo de TypeScript) |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (una pasada) |
| `npm run db:generate` | Genera una migración a partir del esquema |
| `npm run db:migrate` | Aplica las migraciones |

## Documentación

- `docs/BRIEF.md`: visión, alcance, prioridades y hoja de ruta.
- `docs/architecture/system-design.md`: entidades, módulos y propiedad de los datos.
- `docs/SETUP.md`: reglas de código.
- `docs/specs/`: especificaciones (SDD) de cada funcionalidad.
- `docs/DEPLOY.md`: despliegue en Vercel + Neon + Clerk.
