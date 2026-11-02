# Calificador Karlita

Journal personal en Angular standalone, TypeScript estricto, Router y Supabase.

## Estado: paso 4

Login con correo y contraseña, cierre de sesión y guards implementados.
Listado conectado, búsqueda, filtros, paginación y fotos privadas implementados.
Creación y edición implementadas. Vista de detalle y eliminación pendientes del siguiente paso.
No se ha cambiado la base de datos, las políticas RLS ni el bucket existente.
La autenticación se conecta a Supabase desde el navegador. El listado privado consulta items con la sesión del SDK y las políticas RLS existentes.

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
- `src/app/features/auth`: login con Reactive Forms.
- `src/app/features/items`: pantalla privada provisional; formulario y detalle pendientes.
- `src/app/shared`: reservado para controles compartidos.
- `src/environments`: ejemplo y configuración local.

## Vercel

El proyecto incluye vercel.json: preset Angular, build npm run build, salida
dist/calificador-karlita/browser y fallback SPA para Angular Router. Usa Node 24.x.

En Settings → Environment Variables configura SUPABASE_URL y
SUPABASE_PUBLISHABLE_KEY para Production y, si usas despliegues de prueba, Preview.
El paso prebuild genera environment.ts con esos valores sin imprimirlos.
No necesitas GitHub Secrets para el despliegue directo desde Vercel.
Si falta una variable o se detecta una clave privada, el build se detiene.
El chequeo de formato no verifica que la clave corresponda al proyecto.

Los archivos locales se conservan cuando no hay variables de compilación.
Si defines ambas variables en tu terminal, environment.ts se regenera con ellas;
environment.development.ts se conserva. No se requieren variables en el navegador:
la URL y clave pública se incluyen en el bundle al compilar.

Al cambiar valores en Vercel necesitas un nuevo despliegue. Publica estos archivos
en el repositorio conectado para que Vercel reciba la configuración. El entorno
remoto de Vercel no se ha inspeccionado ni se ha iniciado un despliegue desde aquí.
Login y guards implementados. El despliegue remoto sigue pendiente de verificación.

Documentación: https://vercel.com/docs/environment-variables

## Dirección visual

Journal cuadriculado y adaptable a móvil, inspirado en la imagen compartida.
Paleta: #E76814, #DC8236, #D8D4BC, #B8210F, #891A10 y #714236.
La futura ficha adaptará sus campos a serie, película, libro o anime.

## Verificación de esta entrega

- Angular core 22.2.4, CLI 22.2.5 y supabase-js 2.118.0 instalados con lockfile.
- Revisión de TypeScript y plantillas Angular (`ngc --noEmit`): correcta.
- Tipos de los tests (`tsc --noEmit`): correctos.
- Build de producción: correcto.
- Pruebas Angular: 71 de 71 correctas (auth, guards, listado, filtros, fotos y texto escapado).
- Generación de environments: 8 comprobaciones con datos ficticios correctas
  (conservación local, generación, variables faltantes, HTTPS y rechazo de claves privadas).
- El build y las pruebas se verificaron fuera del entorno restringido de ejecución.
- Revisión en navegador Edge: login y redirección anónima correctos, sin errores
  JavaScript ni desbordamiento horizontal a 375 px y 1280 px.
- Autenticación real: pendiente de la prueba manual con tu cuenta; las pruebas automatizadas usan un SDK simulado.

En esta sesión no había npm en PATH. Se usó una copia local temporal en `work/npm`
(ignorada por Git). Si tampoco tienes npm en tu terminal, instala Node LTS con npm
o utiliza temporalmente `node work/npm/package/bin/npm-cli.js start` desde este proyecto.

## Probar el paso 2

1. Ejecuta npm start y abre http://localhost:4200/items en una ventana privada.
2. Sin sesión, debe llevarte a /login. Prueba un correo y contraseña incorrectos:
   el mensaje no debe revelar si el usuario existe. No compartas la contraseña.
3. Entra con tu cuenta existente: debe abrir /items y mostrar tu correo.
4. Recarga /items: se debe restaurar la sesión. Visitar /login con sesión
   debe devolverte a /items.
5. Pulsa Cerrar sesión: debe llevarte a /login. Volver atrás o visitar /items
   no debe mostrar contenido privado. El cierre se aplica a este navegador;
   Supabase sincroniza la sesión entre pestañas.

AuthService expone signals de sesión y usuario y espera la restauración del SDK
antes de resolver los guards. Los tokens y su persistencia los gestiona supabase-js.
La app reacciona al cierre de sesión del SDK, incluso desde otra pestaña. Los guards
organizan el acceso a pantallas; la autorización de los datos sigue en RLS y Storage.

Referencias: https://angular.dev/guide/routing/route-guards y
https://supabase.com/docs/reference/javascript/auth-onauthstatechange

## Login visual

La ruta /login abre un fondo de otoño con un zorrito 3D y el botón Login arriba a
la derecha. El botón abre el formulario existente en un dialog modal centrado,
con desenfoque del fondo. Escape, el botón de cierre y pulsar fuera cierran el
panel; durante el envío no se permite cerrarlo. Se borra la contraseña al cerrar.
El foco queda dentro del panel y vuelve al botón al cerrarlo.

Three.js se instala con npm y se carga de forma diferida. No se usan import maps,
scripts de CDN ni Google Fonts. Los recursos visuales se sirven desde public/login:
modelo GLB optimizado (5,5 MB), video MP4 (8 MB), fondo WebP y zorrito estático WebP.
El video y la animación se pausan al abrir el panel o al ocultar la pestaña. Se
respeta prefers-reduced-motion y hay una imagen de respaldo si WebGL falla.

Los recursos de origen corresponden al prompt proporcionado por el usuario.
La revisión local comprobó firmas/formato, tipos de archivo y que el GLB no
incluyera recursos externos ni extensiones adicionales; no constituye una
certificación de seguridad de los archivos. No se ejecutó el código CDN del prompt.

Origen del modelo:
https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261016_125948_52f145de-4509-41e1-9289-523cf0ac9c86.glb

Después de actualizar el proyecto, ejecuta npm install y npm start. Si ya tienes
sesión, cierra sesión en /items para poder ver /login.

## Pantalla privada

La bienvenida de /items usa un fondo crema sin cuadrícula, colores terracota y
una cabecera de otoño con el zorrito estático local. Se mantiene el cierre de
sesión y la protección de rutas. Las categorías ahora filtran el listado real.
Verificada en navegador a 375, 768 y 1440 px con una cuenta simulada, sin acceder
a datos reales, incluyendo entrada y cierre de sesión mediante el SDK.

## Probar el paso 3

Ejecuta npm start, entra con tu cuenta existente y abre /items. Verás tus fichas
si ya existen en Supabase; una colección vacía es normal si todavía no agregaste
ninguna. No se insertaron ejemplos ni se modificaron tablas o políticas.

- Tarjetas con foto, nombre, tipo, estrellas y nota final; 0 se distingue de una nota ausente.
- Búsqueda por nombre sin distinguir mayúsculas, con 300 ms de espera y comodines tratados como texto literal.
- Filtros por tipo y género combinables con la búsqueda, páginas de 24 y orden estable por fecha e id descendentes.
- Fotos del bucket privado fotos, firmadas en lote por 300 segundos, solo en la carpeta del usuario actual.
- Renovación de fotos cada 4 minutos con la pestaña visible y al volver a ella. Los enlaces solo se mantienen en memoria.
- Errores de lectura con reintento; fotos ausentes o fallidas mantienen visible la tarjeta con respaldo.
- Se cancelan consultas anteriores y se ignoran respuestas tardías al cambiar filtros o sesión.
- Agregar ficha y Editar ficha están habilitados; el detalle sigue pendiente.

La revisión en navegador usó 26 registros ficticios e interceptó las llamadas
a Supabase; verificó paginación, filtros, búsqueda, vacíos, errores, reintento,
fotos firmadas, escape de texto y cierre de sesión a 375, 768 y 1440 px, sin acceder
a registros reales. También quedaron explícitos strict y strictTemplates.

Referencia: https://supabase.com/docs/reference/javascript/storage-from-createsignedurls

## Filtro por género

El selector incluye Romance, Drama, Comedia, Ciencia ficción, Suspense / Thriller,
Terror, Fantasía y Acción / Crimen. Usa las ocho columnas de notas existentes:
un género seleccionado filtra con IS NOT NULL. Incluye cualquier nota, también 0,
y excluye solo NULL, según la preferencia del usuario. No se cambia la tabla ni RLS.

El género se combina con tipo y nombre en Supabase antes de contar y paginar.
Cambiarlo vuelve a la primera página; Limpiar filtros restablece también el género.

## Paso 4: crear y editar fichas

Desde /items, Agregar ficha abre /items/new. Editar ficha abre /items/:id/edit.
Ambas rutas están protegidas y avisan al salir si hay cambios sin guardar.
Solo el nombre es obligatorio; se validan fechas en orden, enteros, calificaciones
0–5, géneros 0–10 y nota final 0–10 con un decimal. Un género sin activar se guarda
como NULL; al activarlo admite 0. Se conservan subgéneros previamente guardados,
incluso personalizados, y se pueden quitar desde la lista de seleccionados.

La ficha adapta sus etiquetas para serie, película, libro o anime. Los campos
comparten las columnas existentes: por ejemplo, capítulo/escena favorita se guarda
en episodio_fav. No se crean columnas, tablas, buckets ni políticas.

Las imágenes de origen pueden ser JPEG/PNG/WebP de hasta 20 MB. El navegador las
decodifica y convierte a WebP, sin ampliar, con lado mayor de hasta 800 px y objetivo
menor a 300 KB, y límite final obligatorio de 2 MB. Solo se suben al guardar.
El bucket fotos permanece privado y se usa <user_id>/<uuid>.webp, con upsert false.

La nueva foto se sube antes del cambio en items; la anterior solo se borra tras
confirmar el guardado y comprobar que ninguna ficha accesible la usa. Ante fallos
de red, no se borra un archivo cuya referencia no se pueda verificar. Una limpieza
fallida se informa por separado y permite reintentar sin volver a guardar la ficha.
No hay transacción distribuida entre tabla y Storage; una limpieza pendiente
requiere reintento. El UUID de una ficha nueva es fijo durante los reintentos de
guardado para no duplicarla. Nunca se envía user_id desde el formulario.

Las pruebas de navegador usaron una cuenta y respuestas simuladas: creación,
edición, tipos, calificaciones, validación, compresión WebP real, reemplazo/retirada
de fotos, error de escritura y reintento. Todas las escrituras se interceptaron;
no se modificaron datos reales. Para probar tu cuenta, ejecuta npm start y crea
una ficha desde Agregar ficha. La vista de detalle y borrar una ficha se harán
en el siguiente paso.

## Personajes y duración estructurados

No requiere cambios en Supabase: personajes y duracion conservan el tipo text.
Los personajes se agregan en filas individuales que permiten editar y quitar.
Enter agrega una fila sin enviar la ficha; las filas vacías no se guardan.
Se serializan con un salto de línea entre nombres. El texto antiguo de una sola
línea se conserva como una sola entrada; no se separa por comas para evitar
romper nombres que puedan contenerlas. Las listas con saltos de línea sí se
abren en filas separadas. Los nombres siguen pasando por los bindings de Angular.

La duración usa horas enteras no negativas y minutos 00–59, con botones para
ajustar horas y un selector de minutos. Se guarda como HH:mm, admitiendo más de
24 horas (por ejemplo 27:30); no es una hora del día. Quitar duración guarda NULL.
Valores antiguos como 45 min, 2 h 15 min o 01:30 se interpretan sin modificarlos
hasta que el usuario edita el control. Otros formatos se muestran tal cual y
solo se reemplazan al elegir Cambiar a horas y minutos. No se descartan segundos
no nulos ni se adivinan unidades de un número sin formato.

Ambos controles se integran a Reactive Forms, incluidos dirty/touched, disabled
y la validación del guardado. Verificados con pruebas y guardado/recarga simulados
en navegador, sin modificar datos reales.
