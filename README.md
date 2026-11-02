# Calificador Karlita

Journal personal en Angular standalone, TypeScript estricto, Router y Supabase.

## Estado: paso 1

Base y cliente configurados. Login, guards, CRUD y fichas todavía pendientes.
No se ha cambiado la base de datos, las políticas RLS ni el bucket existente.
La pantalla inicial no muestra datos privados ni consulta Supabase.

## Configurar y ejecutar

Requiere Node compatible con Angular 22 (por ejemplo Node 24.15 o posterior de la rama 24) y npm.

```sh
npm ci
npm run setup:environments
npm start
```

Abre http://localhost:4200.

Edita `src/environments/environment.development.ts` para desarrollo y
`src/environments/environment.ts` para producción. Ambos se crean desde
`src/environments/environment.example.ts`, sin sobrescribir valores existentes.

- `supabaseUrl`: URL HTTPS de tu proyecto.
- `supabasePublishableKey`: únicamente la publishable key o anon key de tu proyecto.

Nunca uses una clave service_role ni sb_secret_. No pegues contraseñas de usuario
ni tokens de sesión en estos archivos. Las claves públicas forman parte del bundle
del navegador: la protección de datos depende de Auth y de las políticas RLS ya creadas.
Los environments reales están ignorados por Git; el ejemplo sí se versiona.
SupabaseService crea un único cliente al solicitarlo y delega el manejo de sesión al SDK.
Sin valores reales se puede compilar y ver la pantalla de preparación.

```sh
npm run build
npm test -- --watch=false
```

## Carpetas

- `src/app/core/services`: cliente centralizado de Supabase.
- `src/app/features/auth`: reservado para login y estado de sesión.
- `src/app/features/items`: reservado para listado, formulario y detalle.
- `src/app/shared`: reservado para controles compartidos.
- `src/environments`: ejemplo y configuración local.

## Despliegue posterior

Se puede preparar como sitio estático en Vercel o Netlify; consulta los límites
vigentes del plan gratuito del proveedor elegido. No está desplegado todavía.

- Build: `npm run build`.
- Carpeta publicada: `dist/calificador-karlita/browser`.
- Antes del build, crear `src/environments/environment.ts` con la URL y clave
  pública del proyecto. En CI se puede generar desde variables de configuración;
  el archivo ignorado de tu equipo no se sube automáticamente.
- Configurar fallback SPA hacia `/index.html` para las futuras rutas de Angular.
- Antes de usar datos privados, completar login y guards en el siguiente paso.

## Dirección visual

Journal cuadriculado y adaptable a móvil, inspirado en la imagen compartida.
Paleta: #E76814, #DC8236, #D8D4BC, #B8210F, #891A10 y #714236.
La futura ficha adaptará sus campos a serie, película, libro o anime.

## Verificación de esta entrega

- Angular core 22.2.4, CLI 22.2.5 y supabase-js 2.118.0 instalados con lockfile.
- Revisión de TypeScript y plantillas Angular (`ngc --noEmit`): correcta.
- Tipos de los tests (`tsc --noEmit`): correctos.
- Build completo y ejecución de tests: bloqueados en el entorno de trabajo
  por un error de acceso a carpetas superiores al resolver archivos con esbuild.
  Repetir `npm run build` y `npm test -- --watch=false` en tu terminal local.
- Conexión a Supabase: pendiente de configuración real y paso de login.

En esta sesión no había npm en PATH. Se usó una copia local temporal en `work/npm`
(ignorada por Git). Si tampoco tienes npm en tu terminal, instala Node LTS con npm
o utiliza temporalmente `node work/npm/package/bin/npm-cli.js start` desde este proyecto.
