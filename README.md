# Menú a Mano

Aplicación de ordenador, instalable desde una página web, para planificar el menú de la semana y generar la lista de la compra. Los requisitos están en [ESPECIFICACION.md](ESPECIFICACION.md).

## Órdenes

| Orden | Qué hace |
|---|---|
| `npm run dev` | Arranca el servidor de desarrollo. La app está en `http://localhost:5173/app/` y la página de instalación en `http://localhost:5173/`. |
| `npm test` | Ejecuta las pruebas (planificador, lista de la compra, copias de seguridad). |
| `npm run catalog:check` | Valida el catálogo. Los errores impiden compilar; los avisos señalan trabajo pendiente. |
| `npm run build` | Valida el catálogo, comprueba los tipos y compila en `dist/`. |
| `npm run preview` | Sirve `dist/` en `http://localhost:4173/` para probar la instalación y el modo sin conexión. |
| `npm run icons` | Regenera los iconos PNG a partir de `public/icons/icon.svg`. |

Para probar la versión compilada sin instalarla, abre `http://localhost:4173/app/?tab=1`. Sin `?tab=1`, la app abierta en una pestaña lleva a la página de instalación.

## Publicar

El sitio está publicado en Cloudflare (Workers con archivos estáticos) en `https://menu-a-mano.menu-a-mano.workers.dev`. La configuración está en `wrangler.jsonc`.

- `npm run deploy` compila y publica. Requiere haber autorizado antes el equipo con `npx wrangler login`.

La app instalada se actualiza sola la siguiente vez que se abre con conexión. `public/_headers` evita que el service worker se quede en caché.

Si el sitio se sirviera desde una subcarpeta (por ejemplo en GitHub Pages), hay que compilar con la variable `BASE_PATH`, p. ej. `/menu-a-mano/`.

## Estructura

```
index.html        Página de instalación.
app/index.html    Entrada de la app.
catalog/          Ingredientes y recetas (un archivo por receta).
src/domain/       Lógica pura: planificador, lista de la compra, filtros, unidades.
src/data/         Catálogo, esquemas, base de datos local, copias de seguridad.
src/ui/           Pantallas y componentes.
src/i18n/         Textos de la interfaz.
src/landing/      Código de la página de instalación.
src/tests/        Pruebas.
scripts/          Validación del catálogo y generación de iconos.
```

Dependencias entre capas: `ui → data → domain`. `domain` no importa nada de las otras dos.

## Añadir una receta

1. Crea `catalog/recipes/<id>.json`; el nombre del archivo debe coincidir con el `id`.
2. Si usa un ingrediente nuevo, añádelo a `catalog/ingredients.json` con su dieta, alérgenos (`allergens`) y posibles trazas según la marca (`mayContain`).
3. Ejecuta `npm run catalog:check`.

La dieta y los alérgenos de una receta se calculan a partir de sus ingredientes; no se escriben en la receta.

## Pendiente

- **Revisión del catálogo.** Las 25 recetas son un borrador: ninguna tiene `reviewedOn` porque nadie ha revisado todavía sus ingredientes y alérgenos uno a uno.
- **Imágenes.** Ninguna receta tiene foto; la app muestra un marcador. Falta el script que genera los tamaños (§11.3 de la especificación).
- **Cobertura del catálogo.** Faltan recetas para llegar a los mínimos de §13.2 (el validador lo detalla).
- Pruebas de recorrido completo y de accesibilidad automatizadas (Playwright y axe).
- Regla de lint que impida a `domain` importar de otras capas.
- Publicación del sitio.

## Nota sobre `rollup`

`package.json` sustituye `rollup` por `@rollup/wasm-node`. Solo lo usa el paso que genera el service worker. En este equipo, el Control de aplicaciones de Windows bloquea el binario nativo de rollup; la variante WebAssembly hace lo mismo sin código nativo.
