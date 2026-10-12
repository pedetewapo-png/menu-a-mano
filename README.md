# Menú a Mano

Aplicación de ordenador, instalable desde una página web, para planificar el menú de la semana y generar la lista de la compra. Los requisitos están en [ESPECIFICACION.md](ESPECIFICACION.md).

## Órdenes

| Orden | Qué hace |
|---|---|
| `npm run dev` | Arranca el servidor de desarrollo. La app está en `http://localhost:5173/app/` y la página de instalación en `http://localhost:5173/`. |
| `npm test` | Ejecuta las pruebas unitarias (planificador, lista de la compra, copias de seguridad, migraciones). |
| `npm run test:e2e` | Recorre la app en un navegador real, en tamaño de ordenador y de móvil, y comprueba la accesibilidad y el uso sin conexión. Usa el Edge instalado en el equipo. |
| `npm run check:layers` | Comprueba la regla de capas (`ui → data → domain`). |
| `npm run catalog:images` | Genera las imágenes de las recetas a partir de `catalog/images/`. |
| `npm run screenshots` | Captura las pantallas principales en `test-results/screens/` (necesita `npm run dev` en marcha). |
| `npm run catalog:check` | Valida el catálogo. Los errores impiden compilar; los avisos señalan trabajo pendiente. |
| `npm run build` | Valida el catálogo, genera las imágenes, comprueba las capas y los tipos, y compila en `dist/`. |
| `npm run preview` | Sirve `dist/` en `http://localhost:4173/` para probar la instalación y el modo sin conexión. |
| `npm run icons` | Regenera los iconos PNG a partir de `public/icons/icon.svg`. |
| `npm run deploy` | Compila y publica el sitio en GitHub Pages. |

La app se usa directamente en el navegador; instalarla es opcional.

## Publicar

El sitio está publicado con GitHub Pages en <https://pedetewapo-png.github.io/menu-a-mano/>. El código está en la rama `main` y el sitio compilado en la rama `gh-pages`.

- `npm run deploy` compila con la ruta base `/menu-a-mano/` y publica en `gh-pages`. Requiere tener el equipo autorizado con `gh auth login`.
- Subir cambios a `main` (`git push`) guarda el código, pero no publica; para publicar hay que ejecutar `npm run deploy`.

La app instalada se actualiza sola la siguiente vez que se abre con conexión. GitHub mantiene los archivos en caché unos 10 minutos, así que una versión nueva puede tardar ese tiempo en ofrecerse.

Se descartó Cloudflare porque sus direcciones compartidas no eran accesibles desde España el día de la publicación (sábado 10 de octubre de 2026, en horario de partidos de LaLiga), mientras que GitHub Pages sí lo era.

## Estructura

```
index.html        Página de instalación.
app/index.html    Entrada de la app.
catalog/          Ingredientes y recetas (un archivo por receta).
src/domain/       Lógica pura: planificador, lista de la compra, filtros, unidades.
src/data/         Catálogo, esquemas, base de datos local, copias de seguridad.
src/ui/           Pantallas y componentes.
src/i18n/         Textos de la interfaz.
src/landing/      Código de la página de entrada.
src/install.ts    Instalación opcional, compartida por la página de entrada y la app.
src/pwa.ts        Service worker: uso sin conexión y actualizaciones.
src/tests/        Pruebas unitarias.
e2e/              Pruebas de recorrido en navegador.
scripts/          Validación del catálogo, imágenes, capas, iconos, capturas y publicación.
```

Dependencias entre capas: `ui → data → domain`. `domain` no importa nada de las otras dos.

## Añadir una receta

1. Crea `catalog/recipes/<id>.json`; el nombre del archivo debe coincidir con el `id`.
2. Si usa un ingrediente nuevo, añádelo a `catalog/ingredients.json` con su dieta, alérgenos (`allergens`) y posibles trazas según la marca (`mayContain`).
3. Ejecuta `npm run catalog:check`.

La dieta y los alérgenos de una receta se calculan a partir de sus ingredientes; no se escriben en la receta.

## Estado de la v2

Los requisitos están en [ESPECIFICACION-v2.md](ESPECIFICACION-v2.md), que divide el trabajo en fases.

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Pruebas de recorrido y accesibilidad, comprobación de capas, procesado de imágenes | Hecha |
| 1 | Móvil y navegador: navegación inferior, menú día a día, uso en pestaña, instalación opcional | Hecha |
| 2 | Notas en las comidas, modo cocina, desayunos y migración de los datos de la v1 | Hecha |
| 3 | Perfiles de comensal: una ficha por persona, menú que respeta a todas y avisos que dicen de quién es cada restricción | Hecha |
| 4 | Recetas propias: editor, ingredientes propios, foto, exportar e importar por archivo | Hecha |
| 5 | Catálogo: 70 recetas y 8 desayunos, con foto y revisados; calorías | En curso: 25 recetas y 8 desayunos, sin fotos ni revisión |
| 6 | Cuenta con Google y sincronización | Pendiente |
| 7 | Plan familiar y copia personal | Pendiente |
| 8 | IA de texto a receta | Pendiente |
| 9 | Política de privacidad y prueba con 5–10 personas | Pendiente |

Pendiente dentro de lo ya hecho:

- **Revisión del catálogo.** Las 33 recetas son un borrador: ninguna tiene `reviewedOn` porque nadie ha revisado todavía sus ingredientes y alérgenos uno a uno.
- **Imágenes.** Ninguna receta tiene foto; la app muestra un marcador. El script que las procesa ya existe.
- Probar la instalación en un iPhone y en un Android reales.

## Nota sobre `rollup`

`package.json` sustituye `rollup` por `@rollup/wasm-node`. Solo lo usa el paso que genera el service worker. En este equipo, el Control de aplicaciones de Windows bloquea el binario nativo de rollup; la variante WebAssembly hace lo mismo sin código nativo.
