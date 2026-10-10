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
| `npm run deploy` | Compila y publica el sitio en GitHub Pages. |

Para probar la versión compilada sin instalarla, abre `http://localhost:4173/app/?tab=1`. Sin `?tab=1`, la app abierta en una pestaña lleva a la página de instalación.

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

## Nota sobre `rollup`

`package.json` sustituye `rollup` por `@rollup/wasm-node`. Solo lo usa el paso que genera el service worker. En este equipo, el Control de aplicaciones de Windows bloquea el binario nativo de rollup; la variante WebAssembly hace lo mismo sin código nativo.
