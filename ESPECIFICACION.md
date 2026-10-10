# Menú a Mano — Especificación v1

Nombre provisional, pendiente de comprobar disponibilidad antes de publicar.
Fecha: 2026-10-10 · Estado: borrador para revisión

---

## 1. Resumen

Menú a Mano es una aplicación gratuita para planificar las comidas de la semana. A partir de unas preferencias sencillas genera un menú semanal variado con recetas fáciles, permite cambiar o bloquear platos y calcula la lista de la compra según las recetas y el número de comensales.

Funciona sin cuenta, sin servidor y sin conexión. Los datos se guardan en el dispositivo y pueden exportarse, importarse y borrarse.

**La versión 1 es una aplicación de ordenador que se instala desde una página web.** No se usa como una web en una pestaña: la página solo sirve para presentarla e instalarla, y la app se abre después en su propia ventana, con su icono, como cualquier otro programa (§11.7). La adaptación a móvil y las apps de Android e iOS siguen siendo objetivo del proyecto, pero llegan después (§16).

**Lo único que debe hacer excelentemente:** crear un menú semanal práctico que respete siempre las exclusiones, se pueda retocar con facilidad y produzca una lista de la compra correcta.

## 2. Objetivos y límites

### 2.1 Objetivos
- Planificar una semana en menos de cinco minutos una vez configuradas las preferencias.
- Respetar sin excepciones dieta, exclusiones, alérgenos declarados y platos bloqueados.
- Generar una lista de la compra correcta, agrupada y editable.
- Funcionar sin conexión tras la primera carga y conservar los datos al cerrar.
- Coste recurrente cercano a cero y mantenimiento asumible por una sola persona.

### 2.2 Lo que la app no hace
- No muestra anuncios, no vende datos, no incluye rastreadores ni analítica.
- No exige cuenta ni recoge nombre, correo, fecha de nacimiento, peso, altura ni historial médico.
- No prescribe dietas, déficits calóricos ni objetivos de peso; no ofrece dietas terapéuticas.
- No inventa información nutricional ni presenta su contenido como validado por profesionales.
- No relaja una exclusión para completar un menú.
- No promete precios reales de compra.
- No depende de IA ni de servicios de pago.
- No incluye funciones sociales.

### 2.3 Usuarios
Personas adultas (18+) en España, con conocimientos básicos de nutrición y poco tiempo, que cocinan para una o varias personas. Un único rol de usuario.

## 3. Alcance

| Versión 1 | Más adelante | Fuera de alcance |
|---|---|---|
| Configuración inicial de preferencias | Sincronización entre dispositivos | Diario alimentario |
| Menú semanal generado por reglas | Recordatorios | Escáner de códigos o etiquetas |
| Sustituir y bloquear platos | Recetas personales | Reconocimiento por foto |
| Ajuste de comensales | Aprovechar ingredientes disponibles | Seguimiento de peso o medidas |
| Catálogo y detalle de recetas, con imágenes | Información nutricional fiable | Comunidad y retos |
| Favoritos | Otros idiomas | Integraciones (Google Fit, Apple Health…) |
| Menús guardados | IA como función complementaria | Panel de administración |
| Lista de la compra automática y editable | Revisión por nutricionista | Perfiles infantiles |
| Funcionamiento sin conexión | Diseño adaptado a móvil | |
| App de ordenador instalable desde una página | Apps en Google Play y App Store | |
| Página de presentación e instalación | Instalador clásico de Windows (.exe), solo si hiciera falta | |
| Exportar, importar y borrar datos | | |

## 4. Decisiones asumidas

No venían en las respuestas y se han resuelto con un valor por defecto. Cualquiera puede cambiarse antes de empezar.

| # | Decisión | Motivo |
|---|---|---|
| D1 | Se planifican **comida y cena**. El desayuno queda para más adelante. | Con 40–60 recetas, repartirlas en tres franjas deja poca variedad por franja. |
| D2 | La semana va de **lunes a domingo**. | Convención en España. |
| D3 | Cada franja de cada día puede desactivarse ("no planificar"), con un patrón por defecto en preferencias. | Cubre "como fuera entre semana" sin añadir complejidad. |
| D4 | Comensales: valor general (1–12) más ajuste opcional por comida. | Permite invitados un día concreto. |
| D5 | Cada receta tiene **una imagen**, que se muestra junto a ella en el menú, el catálogo y el detalle (§13.3). | Decidido por el autor. |
| D6 | Básicos de despensa (sal, aceite, especias) aparecen en un grupo aparte, sin cantidad. | Nadie compra "3 cucharaditas de pimentón". |
| D7 | Sin gestión de sobras ni cocina por lotes. | Complica el planificador y el cálculo de compra. |
| D8 | Importar **sustituye** todos los datos (previa confirmación); no fusiona. | La fusión solo hace falta con sincronización. |
| D9 | Identificadores de código en inglés; interfaz y contenido en español. | Convención habitual; ver glosario en §8.1. |
| D10 | Las reglas de variedad son objetivos internos del planificador; la interfaz no las presenta como recomendaciones nutricionales. | No hay validación profesional (§12). |
| D11 | La v1 es una **app de ordenador instalable** (PWA en ventana propia), no una web de uso en pestaña. Se instala desde Chrome o Edge en Windows. Se diseña para ventanas de 1024 px o más; si la ventana se estrecha, el contenido se reorganiza en una columna. | Decidido por el autor. Sin coste, sin instalador que firmar y con actualización automática. El zoom accesible (§7.3) ya obliga a un diseño fluido, así que la adaptación a móvil posterior será sobre todo de pulido. |
| D12 | Las imágenes son **fotografías con licencia abierta** (§13.3). | Decidido por el autor. |
| D13 | Quien abra la página con un navegador que no permite instalar (p. ej. Firefox) ve las instrucciones para hacerlo desde Chrome o Edge; no se ofrece el uso en pestaña. | Coherente con D11. Puede relajarse más adelante sin cambios de arquitectura. |

## 5. Historias de usuario

Prioridad: **A** imprescindible para el primer recorrido completo, **B** imprescindible para v1, **C** deseable en v1.

### 5.1 Preferencias

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| P1 | Como persona nueva, quiero indicar mis preferencias en pocos pasos para obtener un menú adecuado. | Tres pasos como máximo. Todos tienen valor por defecto y pueden saltarse. Al terminar se llega al menú con la opción de generarlo. | A |
| P2 | Quiero elegir dieta omnívora, vegetariana o vegana. | El menú generado solo contiene recetas compatibles. | A |
| P3 | Quiero excluir ingredientes o grupos de ingredientes (p. ej. "cerdo", "champiñones"). | Buscador con autocompletado. Ninguna receta con un ingrediente excluido aparece en el menú ni se ofrece como sustituta. | A |
| P4 | Quiero filtrar por alérgenos declarados. | Lista de los 14 alérgenos de declaración obligatoria en la UE. Al activar el primero se muestra el aviso de alcance (§12.2). | A |
| P5 | Quiero fijar el número de comensales. | Valor entre 1 y 12. Afecta a cantidades de recetas y lista de la compra. | A |
| P6 | Quiero limitar el tiempo máximo de preparación. | Opciones: sin límite, 20, 30, 45 y 60 min. Se aplica al tiempo total. | B |
| P7 | Quiero dar preferencia a recetas económicas. | Interruptor. Influye en la puntuación, no es un filtro. El texto aclara que es orientativo. | B |
| P8 | Quiero indicar qué comidas no necesito planificar. | Cuadrícula de 7 días × 2 franjas con casillas. Las franjas inactivas quedan vacías al generar. | B |
| P9 | Si cambio mis preferencias con un menú ya creado, quiero saber qué platos dejan de cumplirlas. | Los platos afectados se marcan con texto e icono y ofrecen "Cambiar". No se eliminan automáticamente. | B |

### 5.2 Menú semanal

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| M1 | Quiero generar el menú de una semana con un botón. | Se rellenan las franjas activas no bloqueadas. Tarda menos de 1 s en un móvil de gama media. | A |
| M2 | Quiero cambiar un plato por otro propuesto automáticamente. | "Cambiar" propone una receta compatible distinta de la actual y de las ya rechazadas en esa franja. | A |
| M3 | Quiero elegir yo el plato de una franja. | "Elegir" abre el catálogo filtrado a recetas compatibles con esa franja. | B |
| M4 | Quiero bloquear platos para que no cambien al regenerar. | Los bloqueados conservan receta y comensales. El estado se indica con texto e icono. | A |
| M5 | Quiero regenerar el resto del menú. | Solo cambian las franjas activas no bloqueadas. Pide confirmación si hay platos elegidos a mano sin bloquear. | A |
| M6 | Quiero vaciar una franja o ajustar sus comensales. | Vaciar deja la franja sin receta. El ajuste de comensales afecta solo a esa comida. | B |
| M7 | Quiero entender por qué el menú no está completo o repite platos. | Aviso con la causa y el filtro que más limita, y un acceso directo a cambiarlo (§9.5). | A |
| M8 | Quiero moverme entre semanas. | Navegación anterior/siguiente. Cada semana conserva su menú. | B |
| M9 | Quiero guardar un menú y reutilizarlo. | Guardar con nombre. Aplicar a una semana pide confirmación si ya tiene platos y revalida contra las preferencias actuales. | B |
| M10 | Quiero mover o intercambiar platos entre franjas sin arrastrar. | Acción "Mover a…" con selector de día y franja; si el destino está ocupado, intercambia. | C |

### 5.3 Recetas

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| R1 | Quiero consultar el catálogo y buscar por nombre o ingrediente. | Búsqueda sin distinguir mayúsculas ni tildes. Filtros: dieta, tiempo, favoritas, "compatibles con mis preferencias". | B |
| R2 | Quiero ver el detalle de una receta. | Ingredientes escalados a los comensales elegidos, pasos numerados, tiempos, alérgenos declarados y dieta. | A |
| R6 | Quiero ver una imagen junto a cada receta para reconocerla de un vistazo. | Miniatura en las franjas del menú y en el catálogo; imagen grande en el detalle. Si falta o no carga, se muestra un marcador neutro del mismo tamaño y nada se descoloca. Las imágenes se ven sin conexión. | B |
| R3 | Quiero cambiar los comensales en el detalle. | Recalcula cantidades al momento sin modificar el menú. | B |
| R4 | Quiero marcar favoritas. | Las favoritas tienen más probabilidad de aparecer, sin saltarse ninguna restricción. | B |
| R5 | Quiero añadir una receta al menú desde su detalle. | Selector de día y franja. Si la receta no cumple las preferencias, la acción está desactivada y explica por qué. | C |

### 5.4 Lista de la compra

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| C1 | Quiero una lista calculada a partir del menú. | Suma ingredientes iguales de todas las recetas, escalados por comensales (§10). | A |
| C2 | Quiero verla agrupada por secciones del supermercado. | Secciones fijas en orden de recorrido habitual; básicos de despensa al final. | A |
| C3 | Quiero marcar lo comprado. | Casilla por artículo. Los marcados pasan al final de su sección. El estado se conserva. | A |
| C4 | Quiero indicar que ya tengo algo en casa. | "Ya lo tengo" lo retira de la lista activa a un grupo plegado y es reversible. | B |
| C5 | Quiero añadir, editar y borrar artículos a mano. | Los artículos manuales sobreviven a la regeneración del menú. | B |
| C6 | Quiero que la lista se actualice al cambiar el menú sin perder mis ajustes. | Se recalculan las cantidades derivadas. Si cambia la cantidad de un artículo ya marcado, se desmarca y se señala como actualizado. | A |
| C7 | Quiero saber de qué recetas viene cada artículo. | Al desplegar un artículo se listan las recetas y la cantidad de cada una. | C |
| C8 | Quiero copiar o compartir la lista como texto. | Copia al portapapeles; usa el menú nativo de compartir si existe. | C |

### 5.5 Datos y ajustes

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| A1 | Quiero que todo se conserve al cerrar la app. | Tras cerrar y reabrir, preferencias, menús, favoritos y lista están intactos. | A |
| A2 | Quiero exportar una copia de seguridad. | Descarga un JSON con todos los datos de usuario y la versión del esquema. | B |
| A3 | Quiero importar una copia. | Valida el archivo antes de tocar nada. Si es inválido, explica el motivo y no modifica datos. Pide confirmación antes de sustituir. | B |
| A4 | Quiero borrar todos mis datos. | Confirmación explícita. Deja la app como recién instalada. | B |
| A5 | Quiero usar la app sin conexión. | Con el dispositivo sin red se puede generar y modificar menús, ver recetas y gestionar la compra. | B |
| A6 | Quiero saber qué hace y qué no hace la app. | Pantalla "Acerca de" con aviso de alcance, privacidad, versión y créditos de las imágenes. | B |
| A7 | Quiero instalar la app desde su página con un solo botón. | El botón "Instalar" abre el diálogo de instalación del navegador. Tras aceptar, la app tiene icono propio y se abre en su ventana, sin barra de direcciones ni pestañas. | B |
| A8 | Si ya la tengo instalada y vuelvo a la página, quiero saber cómo abrirla. | La página indica que ya está instalada y que se abre desde su icono, en lugar de ofrecer "Instalar". (Una web no puede abrir de forma fiable la ventana de la app instalada.) | C |
| A9 | Si mi navegador no permite instalarla, quiero saber qué hacer. | La página lo detecta y explica cómo instalarla desde Chrome o Edge. | B |
| A10 | Quiero que la app se actualice sin reinstalar. | Al haber versión nueva, la app ofrece "Actualizar ahora" y conserva todos los datos. | B |

## 6. Pantallas

Navegación principal con cuatro destinos: **Menú**, **Recetas**, **Compra**, **Ajustes**. En la v1 es una barra lateral; la barra inferior para móvil llega con la adaptación posterior.

### 6.1 Configuración inicial
Solo en el primer uso; después todo es editable desde Ajustes.
1. **Cómo comes:** dieta y comensales.
2. **Qué evitas:** ingredientes excluidos y alérgenos.
3. **Tu semana:** tiempo máximo, preferencia económica y franjas a planificar.

Cierra con el aviso breve de alcance (§12.1) y el botón "Crear mi primer menú".

### 6.2 Menú semanal
- Cabecera con la semana y navegación anterior/siguiente.
- Cuadrícula de siete columnas (días) por dos filas (comida y cena); en ventanas estrechas pasa a lista vertical por días.
- Cada franja muestra la miniatura de la receta, su nombre, tiempo total y estado (bloqueada, no cumple preferencias).
- Acciones por franja en un menú con nombre accesible: Ver receta, Cambiar, Elegir, Bloquear/Desbloquear, Comensales, Mover a…, Vaciar.
- Acciones generales: Generar/Regenerar, Guardar menú, Menús guardados, Ir a la compra.
- Zona de avisos del planificador.
- Estado vacío: explicación de una línea y botón "Generar menú".

### 6.3 Catálogo de recetas
Buscador, filtros y cuadrícula de tarjetas. Cada tarjeta muestra imagen, nombre, tiempo, dieta y si es favorita. Las recetas incompatibles con las preferencias siguen visibles, con el motivo indicado ("contiene champiñones").

### 6.4 Detalle de receta
Imagen, nombre, descripción breve, tiempos, selector de comensales, ingredientes escalados, pasos numerados, alérgenos declarados, notas y procedencia de la receta y de la imagen. En ordenador, ingredientes y pasos van en dos columnas. Acciones: Favorita, Añadir al menú.

### 6.5 Lista de la compra
Vinculada a la semana visible. Secciones plegables, casillas, "Ya lo tengo", añadir artículo, copiar/compartir. Indicador "n de m comprados". Estado vacío si la semana no tiene menú.

### 6.6 Ajustes
- **Preferencias:** los mismos campos que la configuración inicial.
- **Datos:** exportar, importar, borrar todo, fecha de la última copia.
- **Apariencia:** tamaño de texto (respeta además el del sistema), tema claro/oscuro/sistema.
- **Acerca de:** alcance, privacidad, versión, licencias y créditos de imágenes (lista generada automáticamente desde el catálogo).

### 6.7 Página de instalación
Es lo único que se ve en una pestaña del navegador. No forma parte de la app.
- Nombre, una frase que explica qué hace y dos o tres capturas.
- Botón principal **Instalar**; si ya está instalada, un aviso de que se abre desde su icono.
- Tres puntos breves: gratuita y sin anuncios, sin cuenta, funciona sin conexión.
- Si el navegador no permite instalar: instrucciones para hacerlo desde Chrome o Edge.
- Enlaces a privacidad y a créditos.

## 7. Diseño y accesibilidad

### 7.1 Estilo
Minimalista y práctico. Fondo claro, verde como color principal, acentos cálidos. Logotipo tipográfico. Fuentes del sistema (sin peticiones a servicios externos).

### 7.2 Tono
Cercano, claro y tranquilo, con lenguaje cotidiano. Sin juicios sobre el cuerpo o la comida, sin "permitido/prohibido", sin recompensas por restringir, sin rachas ni puntuaciones.

### 7.3 Accesibilidad
Objetivo: WCAG 2.2 nivel AA.
- Toda la funcionalidad es operable con teclado, con foco visible y orden lógico.
- Ninguna acción requiere arrastrar.
- Controles con nombre accesible; iconos siempre acompañados de texto o etiqueta.
- Los estados (bloqueado, comprado, incompatible) se comunican con texto o icono además del color.
- Contraste mínimo 4,5:1 en texto y 3:1 en componentes.
- Áreas pulsables de al menos 44 × 44 px, también en ordenador.
- Las imágenes de receta son un apoyo, nunca la única forma de identificar un plato: el nombre aparece siempre. En menú y catálogo la miniatura es decorativa (`alt=""`) porque el nombre está al lado; en el detalle lleva texto alternativo descriptivo.
- El diseño soporta zoom del 200 % y texto ampliado sin pérdida de contenido ni desplazamiento horizontal.
- Los cambios dinámicos (menú generado, avisos, artículo actualizado) se anuncian mediante regiones `aria-live`.
- Se respeta `prefers-reduced-motion`.

## 8. Modelo de datos

### 8.1 Glosario

| Dominio | Código |
|---|---|
| Receta | `Recipe` |
| Ingrediente | `Ingredient` |
| Franja (comida/cena de un día) | `MealSlot` |
| Menú semanal | `WeekPlan` |
| Menú guardado | `SavedPlan` |
| Preferencias | `Preferences` |
| Lista de la compra | `ShoppingList` |
| Básico de despensa | `pantryStaple` |

### 8.2 Catálogo (solo lectura, incluido en la app)

```ts
type Diet = 'omnivore' | 'vegetarian' | 'vegan';
type MealType = 'lunch' | 'dinner';
type BaseUnit = 'g' | 'ml' | 'unit';
type RecipeUnit = BaseUnit | 'tbsp' | 'tsp' | 'pinch' | 'toTaste';

// Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011)
type Allergen =
  | 'gluten' | 'crustaceans' | 'eggs' | 'fish' | 'peanuts' | 'soy' | 'milk'
  | 'treeNuts' | 'celery' | 'mustard' | 'sesame' | 'sulphites' | 'lupin' | 'molluscs';

type ShopSection =
  | 'produce' | 'meat' | 'fish' | 'dairyEggs' | 'bakery' | 'dryGoods'
  | 'canned' | 'frozen' | 'condiments' | 'other';

interface Ingredient {
  id: string;                 // estable, nunca se reutiliza
  name: string;
  namePlural?: string;
  section: ShopSection;
  baseUnit: BaseUnit;         // unidad en la que se suma y se compra
  gramsPerUnit?: number;      // permite convertir 'unit' <-> 'g' (p. ej. 1 cebolla ≈ 150 g)
  diet: Diet;                 // dieta más restrictiva que lo admite
  allergens: Allergen[];      // contiene
  mayContain: Allergen[];     // depende de la marca (caldos, salsas, pan); se filtra igual que 'allergens'
  groups: string[];           // para exclusiones por grupo: 'pork', 'shellfish', 'mushrooms'…
  pantryStaple: boolean;
}

type MainGroup =
  | 'legumes' | 'fish' | 'whiteMeat' | 'redMeat' | 'eggs'
  | 'vegetables' | 'grainsPasta' | 'plantProtein';

interface RecipeIngredient {
  ingredientId: string;
  quantity: number | null;    // null con 'toTaste'
  unit: RecipeUnit;
  optional?: boolean;         // los opcionales cuentan para exclusiones y alérgenos
  note?: string;              // "picada fina"
}

interface Recipe {
  id: string;                 // estable, nunca se reutiliza
  name: string;
  summary: string;
  mealTypes: MealType[];
  baseServings: number;
  totalMinutes: number;
  activeMinutes: number;
  cost: 1 | 2 | 3;            // estimación relativa, orientativa
  mainGroup: MainGroup;
  cuisine: 'spanish' | 'mediterranean' | 'other';
  ingredients: RecipeIngredient[];
  steps: string[];
  notes?: string;
  image: RecipeImage;
  source: { author: string; license: string; url?: string };
  reviewedOn: string;         // fecha de la última revisión de ingredientes y alérgenos
}

interface RecipeImage {
  file: string;               // original en catalog/images/, p. ej. "lentejas-estofadas.jpg"
  alt: string;                // descripción para el detalle de la receta
  origin: 'licensed' | 'own'; // 'own' solo cuando no hay foto abierta adecuada
  title?: string;             // título de la obra original, si lo tiene
  author: string;
  license: string;            // identificador de la lista de licencias admitidas (§13.3)
  sourceUrl?: string;         // página original de la foto; obligatoria si 'licensed'
  retrievedOn?: string;       // fecha en que se comprobó la licencia; obligatoria si 'licensed'
  modifications: string;      // p. ej. "Recortada y redimensionada"
}

// Calculado al compilar, nunca escrito a mano
interface DerivedRecipeInfo {
  diet: Diet;
  allergens: Allergen[];      // unión de 'allergens' y 'mayContain' de sus ingredientes
  ingredientIds: string[];
  groups: string[];
}
```

**Dieta y alérgenos de una receta se derivan siempre de sus ingredientes.** No se declaran a mano, lo que elimina la inconsistencia más peligrosa del catálogo.

### 8.3 Datos de usuario (IndexedDB)

```ts
interface Preferences {
  diet: Diet;
  servings: number;                    // 1–12
  excludedIngredientIds: string[];
  excludedGroups: string[];
  excludedAllergens: Allergen[];
  maxTotalMinutes: number | null;
  preferBudget: boolean;
  activeSlots: boolean[][];            // [día 0–6][0 = comida, 1 = cena]
  onboardingDone: boolean;
}

interface MealSlot {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;      // 0 = lunes
  mealType: MealType;
  active: boolean;
  recipeId: string | null;
  locked: boolean;
  servingsOverride?: number;
  origin: 'generated' | 'manual';
}

interface WeekPlan {
  weekStart: string;                   // clave: fecha ISO del lunes
  slots: MealSlot[];                   // 14
  seed: number;                        // semilla de la última generación
  updatedAt: string;
}

interface SavedPlan {
  id: string;
  name: string;
  slots: Pick<MealSlot, 'day' | 'mealType' | 'recipeId'>[];
  createdAt: string;
}

interface Favorite { recipeId: string; addedAt: string }

// Solo se guardan los ajustes del usuario; las cantidades se recalculan desde el menú
interface ShoppingListState {
  weekStart: string;                                        // clave
  checked: Record<string, { quantityWhenChecked: number }>; // por ingredientId
  alreadyHave: string[];                                    // ingredientIds
  manualItems: { id: string; text: string; section: ShopSection; checked: boolean }[];
}

interface Meta { schemaVersion: number; lastExportAt?: string }
```

### 8.4 Copia de seguridad

```json
{
  "app": "menu-a-mano",
  "schemaVersion": 1,
  "exportedAt": "2026-10-10T18:00:00Z",
  "data": {
    "preferences": {},
    "weekPlans": [],
    "savedPlans": [],
    "favorites": [],
    "shoppingLists": []
  }
}
```

- Se valida entero antes de escribir nada.
- Una copia de un esquema anterior se migra paso a paso; una de un esquema posterior se rechaza con mensaje claro.
- Si una copia referencia una receta que ya no existe, la franja se muestra como "Receta no disponible" y se puede sustituir.

## 9. Reglas del planificador

Función pura y determinista: mismas entradas y misma semilla producen el mismo menú.

```ts
generatePlan(input: {
  catalog; preferences; favorites;
  currentPlan;        // franjas bloqueadas y activas
  previousPlan?;      // menú de la semana anterior
  seed: number;
}): { plan: WeekPlan; notices: PlannerNotice[] }
```

### 9.1 Restricciones obligatorias
Nunca se relajan. Una receta es candidata para una franja solo si cumple todas:
1. Su dieta derivada es compatible con la dieta elegida.
2. No contiene ningún ingrediente excluido ni de un grupo excluido, incluidos los opcionales.
3. No contiene ni puede contener ningún alérgeno excluido.
4. Su tiempo total no supera el máximo elegido.
5. Admite el tipo de comida de la franja.

Además, las franjas bloqueadas e inactivas no se tocan.

### 9.2 Criterios de variedad
Se expresan como penalizaciones con pesos definidos en un único archivo de configuración.

| Criterio | Regla |
|---|---|
| Sin repetir en la semana | Una receta no aparece dos veces. |
| Sin repetir la semana anterior | Se evitan las recetas del menú previo. |
| Alternancia | El mismo grupo principal no aparece en comidas consecutivas ni dos veces el mismo día. |
| Reparto semanal | Límite por grupo principal y presencia mínima de legumbres y, si la dieta lo admite, de pescado. Umbrales configurables. |
| Cenas más rápidas | En cenas puntúan mejor las recetas con menos tiempo activo. |
| Favoritas | Bonificación moderada, limitada para que no dominen el menú. |
| Económicas | Con la preferencia activa, bonifica el coste 1 y penaliza el 3. |

Los umbrales del reparto semanal son valores internos. Antes de mostrarlos al usuario como recomendaciones habría que contrastarlos con una fuente oficial y, preferiblemente, con un profesional.

### 9.3 Algoritmo
1. Calcular los candidatos de cada franja libre aplicando §9.1.
2. Ordenar las franjas de menos a más candidatos.
3. Para cada franja, puntuar sus candidatos según §9.2 teniendo en cuenta lo ya asignado y lo bloqueado, y elegir al azar (con la semilla) entre los tres mejores.
4. Si una franja se queda sin candidatos admisibles, aplicar §9.4.
5. Verificar el resultado completo contra §9.1 antes de devolverlo. Un fallo aquí es un error de programación y debe saltar en las pruebas.

Se elige un algoritmo voraz por simplicidad. Si la calidad no convence, puede añadirse una fase de mejora por intercambios sin cambiar la interfaz de la función.

### 9.4 Relajación cuando no hay suficientes recetas
Solo se relajan criterios de variedad, en este orden, y cada paso genera un aviso:
1. Permitir recetas de la semana anterior.
2. Permitir repetir una receta en la semana, como máximo dos veces y no en días consecutivos.
3. Si aun así no hay candidatos, la franja queda vacía.

La alternancia y el reparto semanal son penalizaciones (§9.2), no bloqueos: nunca dejan una franja sin candidatos, así que no necesitan un paso de relajación propio.

### 9.5 Avisos
Cada aviso indica qué ha pasado y cómo resolverlo:
- "Con tus preferencias hay 9 recetas para 14 comidas, así que algunas se repiten."
- "No hay recetas de cena compatibles. El tiempo máximo de 20 min es lo que más limita: sin él habría 11."

El filtro más limitante se obtiene contando candidatos al retirar cada preferencia por separado. El aviso enlaza con el ajuste correspondiente.

### 9.6 Sustitución
- **Cambiar:** mismas reglas que la generación, para una sola franja, excluyendo la receta actual y las rechazadas en esa franja durante la sesión. Si no quedan alternativas, lo dice.
- **Elegir:** el usuario escoge entre las candidatas de §9.1. Los criterios de variedad no bloquean una elección manual.
- Un plato elegido a mano queda marcado como `manual`; regenerar lo sustituye solo tras confirmación, salvo que esté bloqueado.

## 10. Reglas de la lista de la compra

Función pura: `buildShoppingList(plan, catalog, preferences) → ShoppingItem[]`. La interfaz combina su resultado con `ShoppingListState`.

1. **Escalado:** cantidad × (comensales de la franja ÷ raciones base de la receta).
2. **Conversión a unidad base:** cada cantidad se convierte a la `baseUnit` del ingrediente (con `gramsPerUnit`; cucharada = 15 ml y cucharadita = 5 ml para líquidos).
3. **Suma:** por ingrediente, sobre todas las franjas con receta.
4. **Redondeo, una sola vez y después de sumar:** siempre hacia arriba.
   - Unidades: al entero superior.
   - g y ml: a múltiplos de 5 por debajo de 100, de 10 hasta 1000, y de 50 por encima.
5. **Presentación:** kg o l a partir de 1000. Cuando existe `gramsPerUnit`, se añade equivalencia aproximada: "450 g de cebolla (≈ 3)".
6. **Básicos de despensa:** se listan sin cantidad en el grupo "Comprueba tu despensa", sin marcar.
7. **"Al gusto" y "pizca":** no se suman; el ingrediente se trata como básico de despensa.
8. **Opcionales:** se incluyen, señalados como "(opcional)".
9. **Orden:** por sección en orden fijo y alfabético dentro de cada una.

En el **detalle de receta** el redondeo es distinto: las unidades contables se redondean al medio más cercano y el resto con las mismas escalas, sin forzar hacia arriba.

El validador del catálogo garantiza que toda cantidad de receta sea convertible a la unidad base de su ingrediente, de modo que nunca aparezcan dos líneas para el mismo ingrediente.

## 11. Arquitectura

### 11.1 Tecnologías
- **React + TypeScript + Vite.**
- **App instalable:** PWA con `vite-plugin-pwa` (Workbox), manifiesto con `display: standalone` y toda la app y el catálogo en caché previa (§11.7).
- **Almacenamiento:** IndexedDB mediante Dexie, tras una interfaz de repositorio propia.
- **Validación:** Zod para catálogo, datos guardados e importaciones.
- **Navegación:** React Router.
- **Estilos:** CSS con variables y módulos, sin biblioteca de componentes pesada. Primitivas accesibles (p. ej. Radix) solo para diálogos y menús.
- **Imágenes:** `sharp` en un script de compilación para generar los tamaños y formatos.
- **Móvil (fases 6 y 7):** Capacitor.
- **Pruebas:** Vitest, fast-check, Testing Library, Playwright y axe.
- **Alojamiento:** GitHub Pages, en `https://pedetewapo-png.github.io/menu-a-mano/`.

### 11.2 Capas

```
src/
  domain/      Lógica pura: planificador, compra, filtros, unidades, tipos.
               Sin React, sin IndexedDB, sin fechas del sistema ni azar no sembrado.
  data/        Catálogo compilado, repositorios, migraciones, exportar/importar.
  ui/          Pantallas, componentes y hooks.
  i18n/        Textos de interfaz por idioma.
catalog/       Ingredientes y un archivo por receta (fuente editable).
  images/      Una imagen original por receta.
scripts/       Validación y compilación del catálogo.
```

Regla de dependencias: `ui → data → domain`. `domain` no importa nada de las otras capas; esto se comprueba con una regla de lint.

### 11.3 Catálogo
- Un archivo JSON por receta (`catalog/recipes/<id>.json`) y uno solo con todos los ingredientes (`catalog/ingredients.json`), editados a mano.
- `npm run catalog:check` valida esquemas, referencias, convertibilidad de unidades, identificadores únicos y cobertura mínima (§13.2), y calcula la información derivada.
- La compilación falla si el catálogo no es válido.
- Los identificadores no se reutilizan. Una receta retirada se marca como retirada en lugar de borrarse, para no romper menús guardados.
- `npm run catalog:images` genera, a partir de cada original, una miniatura (320 px de ancho) y una imagen de detalle (960 px), en WebP y con proporción 4:3. Los originales no se publican.
- El validador comprueba que cada receta tiene imagen, texto alternativo y autor, que su licencia está en la lista de admitidas, que las fotos de terceros tienen enlace de origen y fecha de comprobación, que el archivo existe y que el peso total de las imágenes generadas no supera el presupuesto (§11.5).
- La lista de licencias admitidas vive en un único archivo (`catalog/licenses.json`) con nombre, enlace al texto legal y si exige atribución.

### 11.4 Persistencia
- La interfaz accede a los datos solo a través de repositorios (`PreferencesRepo`, `WeekPlanRepo`…). Esto permite cambiar IndexedDB por SQLite en móvil o añadir sincronización más adelante.
- Cada cambio se guarda de inmediato; no hay botón "Guardar".
- Migraciones numeradas y probadas por versión de esquema.
- Se solicita almacenamiento persistente con `navigator.storage.persist()`.
- **Riesgo conocido:** Safari en iOS puede borrar los datos de sitios web no instalados tras un periodo sin uso. La app lo mitiga invitando a instalarla y mostrando en Ajustes la fecha de la última copia.

### 11.5 Sin conexión
- Tras la primera visita completa, todas las funciones de v1 operan sin red.
- Las imágenes se guardan en caché previa junto con el resto de la app, para que el catálogo se vea completo sin red. Presupuesto: 6 MB en total para 60 recetas (unos 15 KB por miniatura y 80 KB por imagen de detalle).
- Las imágenes se sirven con `width` y `height` declarados y carga diferida, para que la página no salte al cargarlas.
- La app indica cuándo está lista para usarse sin conexión.
- Cuando hay una versión nueva, se ofrece actualizar; nunca se recarga sola en mitad de una edición.
- La app no hace ninguna petición a terceros.

### 11.6 Internacionalización
- Ningún texto de interfaz escrito directamente en componentes; todo pasa por claves de traducción.
- Fechas, números y plurales con la API `Intl`.
- Los textos del catálogo están en español; las traducciones futuras se añadirán como archivos paralelos por idioma con los mismos identificadores.

### 11.7 Instalación y distribución
- Un único sitio estático con dos partes: la página de instalación en `/` y la app en `/app/`. El manifiesto arranca la app en `/app/` (`start_url`); su ámbito (`scope`) es todo el sitio para que la página de instalación pueda lanzar el diálogo. Si la página de instalación se abre dentro de la app ya instalada, redirige a `/app/`.
- La página de instalación captura el evento `beforeinstallprompt` y lo lanza desde el botón "Instalar". Ese evento solo existe en navegadores basados en Chromium; si no llega, se muestran las instrucciones de D13.
- Si alguien abre `/app/` en una pestaña sin tenerla instalada, se le redirige a la página de instalación. La app detecta que está instalada con `display-mode: standalone`.
- El manifiesto incluye nombre, iconos (también enmascarables), colores y capturas, para que el diálogo de instalación sea completo.
- Requiere HTTPS, que los alojamientos estáticos gratuitos previstos ya ofrecen.
- La actualización llega sola: al abrir la app con conexión se descarga la versión nueva y se ofrece aplicarla (A10). No hay instaladores que publicar ni firmar.
- **Dónde quedan los datos:** en el perfil del navegador desde el que se instaló. Desinstalar la app o borrar los datos de navegación de ese sitio los elimina; por eso las copias exportables (A2) son la salvaguarda, y Ajustes muestra la fecha de la última.
- Un instalador clásico de Windows queda fuera de v1. Si llegara a hacer falta, la misma app puede empaquetarse (p. ej. con Tauri) sin tocar dominio ni interfaz, gracias a la separación por capas y a los repositorios.

## 12. Salud, alérgenos y privacidad

### 12.1 Aviso de alcance
En la configuración inicial y en "Acerca de":

> Menú a Mano te ayuda a organizar tus comidas. No es un servicio médico ni nutricional, y su contenido no ha sido revisado por profesionales sanitarios. Si tienes una condición de salud o necesidades específicas, consulta con un profesional.

### 12.2 Aviso de alérgenos
Al activar un filtro de alérgenos y en cada detalle de receta:

> Los filtros se basan en los ingredientes habituales de cada receta. Comprueba siempre las etiquetas de los productos que compres y ten en cuenta la contaminación cruzada.

### 12.3 Salvaguardas
- La app no muestra calorías ni macronutrientes en v1.
- No hay objetivos de peso ni mensajes sobre "portarse bien" o "compensar".
- Los ingredientes de composición variable según la marca se tratan como si contuvieran el alérgeno (`mayContain`).

### 12.4 Privacidad
- Solo se guardan preferencias alimentarias, exclusiones, comensales, favoritos, menús y lista de la compra, y solo en el dispositivo.
- Sin cuentas, cookies, analítica ni peticiones a terceros.
- El proveedor de alojamiento puede registrar direcciones IP al servir los archivos; la nota de privacidad lo menciona.
- Las exclusiones y alérgenos podrían revelar información de salud. Al no salir del dispositivo no hay tratamiento por parte del autor, pero el archivo exportado advierte de que contiene esos datos.
- Se publica una política de privacidad breve; las tiendas la exigen aunque no se recojan datos.

## 13. Contenido

### 13.1 Criterios editoriales
- 40–60 recetas originales, de cocina cotidiana española y mediterránea más algunas sencillas de otras cocinas.
- Ingredientes habituales de supermercado en España.
- Textos propios. No se copia redacción ajena; cada receta registra autor, licencia y fuente.
- Sin datos nutricionales.
- Pasos breves, con una acción por paso.
- Cada receta lleva fecha de revisión de ingredientes y alérgenos, hecha por una persona.

### 13.2 Cobertura mínima
Con las combinaciones más restrictivas previstas el menú debe poder completarse sin llegar al paso 2 de §9.4.

| Requisito | Mínimo |
|---|---|
| Recetas veganas aptas para comida o cena | 16 |
| Recetas vegetarianas (incluye veganas) | 26 |
| Recetas de 30 min o menos | 20 |
| Recetas aptas para cena | 20 |
| Recetas sin gluten | 16 |
| Recetas de coste 1 | 15 |
| Recetas con legumbres como grupo principal | 8 |

El validador comprueba estos mínimos en cada compilación.

### 13.3 Imágenes
Las imágenes son **fotografías con licencia abierta** (D12). Cuando no exista una foto abierta adecuada para una receta, se usa una foto propia.

**Requisitos de cada imagen**
- Una por receta, que muestre el plato terminado y se corresponda con la receta tal como está escrita. No debe aparecer ningún ingrediente que la receta no lleve, sobre todo si es un alérgeno.
- Aspecto lo más coherente posible en todo el catálogo: plato centrado, luz natural, fondo sencillo.
- Proporción 4:3 tras el recorte y original de al menos 1200 px de ancho.
- Sin marcas comerciales, personas reconocibles ni texto incrustado.

**Licencias**

| Licencia | ¿Se admite? | Condiciones |
|---|---|---|
| CC0 y dominio público | Sí | Ninguna; aun así se registra el origen. |
| CC BY | Sí | Atribuir autor y licencia, enlazar el original e indicar que se ha modificado. |
| CC BY-SA | Sí | Como CC BY; además, la versión recortada se ofrece bajo la misma licencia, lo que se indica en los créditos. |
| Licencias propias de bancos gratuitos (Unsplash, Pexels, Pixabay…) | Sí | No son Creative Commons: hay que leer sus condiciones vigentes al descargar. Se atribuye igualmente. |
| Con "ND" (sin obras derivadas) | No | Recortar a 4:3 es una modificación. |
| Con "NC" (no comercial) | No | Criterio de prudencia: evita dudas si la app llega a las tiendas o cambia de modelo. |
| Sin licencia explícita | No | Que una foto esté en internet no da permiso para usarla. |

Fuentes sugeridas: Wikimedia Commons, Openverse (buscador de contenido con licencias abiertas), Unsplash y Pexels.

**Procedimiento por imagen**
1. Comprobar la licencia en la página original de la foto, no en el buscador que la muestra.
2. Comprobar que el plato coincide con la receta.
3. Guardar el original en `catalog/images/`.
4. Registrar en la receta título, autor, licencia, enlace de origen, fecha de comprobación y modificaciones.
5. Si no hay foto adecuada, usar una propia (`origin: 'own'`).

**Atribución**
- En el detalle de cada receta, junto a la imagen: "Foto: Autor · Licencia", con enlaces al original y a la licencia.
- En "Acerca de → Créditos de imágenes" y en la página de instalación: lista completa generada desde el catálogo, para que nunca quede desactualizada.

Una licencia puede estar mal indicada en origen (alguien sube una foto que no es suya). Si surge una reclamación, basta con sustituir el archivo y los datos de esa receta y publicar una versión nueva.

## 14. Pruebas

| Ámbito | Qué se comprueba |
|---|---|
| Planificador (propiedades, fast-check) | Para preferencias y semillas aleatorias: ningún menú incumple §9.1, los bloqueados no cambian, las franjas inactivas quedan vacías, el resultado es determinista. |
| Planificador (casos) | Relajación en el orden correcto y avisos esperados con catálogos reducidos. |
| Lista de la compra | Escalado, conversión, suma, redondeo y básicos de despensa con casos calculados a mano. |
| Datos | Migraciones, exportar e importar de ida y vuelta, rechazo de archivos inválidos. |
| Catálogo | Validador en cada compilación, incluidas imágenes, licencias y presupuesto de peso. |
| Instalación | Manifiesto válido e instalable (auditoría de Lighthouse). Prueba manual antes de cada publicación en Chrome y Edge sobre Windows: instalar, abrir en ventana propia, usar sin red, actualizar y comprobar que los datos se conservan. |
| Tamaños de ventana | Recorrido completo a 1280 px y a 1024 px de ancho. |
| Recorrido completo (Playwright) | Preferencias → menú → lista; lo mismo sin red; persistencia tras recargar. |
| Accesibilidad | axe sin errores en cada pantalla; recorrido completo solo con teclado; revisión manual con lector de pantalla antes de cada publicación. |

## 15. Criterios de aceptación de v1

1. Una persona nueva completa la configuración y obtiene un menú en menos de cinco minutos.
2. Con las preferencias ya configuradas, generar y ajustar una semana lleva menos de cinco minutos.
3. Ningún menú generado ni ninguna sustitución propuesta incumple una restricción obligatoria (verificado con pruebas de propiedades).
4. Regenerar no altera ningún plato bloqueado.
5. La lista de la compra coincide con el cálculo manual en los casos de prueba definidos, para 1, 2, 4 y 5 comensales.
6. Cuando no hay suficientes recetas, la app lo explica y señala el filtro que más limita.
7. Sin red, todas las funciones de v1 siguen operativas.
8. Cerrar y reabrir conserva todos los datos.
9. Exportar, borrar todo e importar devuelve la app al estado exacto anterior.
10. Todas las pantallas pasan axe sin errores y son operables solo con teclado.
11. La app no realiza peticiones de red a terceros.
12. Todas las recetas tienen imagen con autor, licencia admitida y origen registrados; la atribución es visible en la app y las imágenes se ven sin conexión.
13. La app se instala desde su página en Chrome y Edge sobre Windows, se abre en ventana propia sin interfaz de navegador y se actualiza conservando los datos.
14. El autor la usa cuatro semanas seguidas para organizar comidas y compras reales.

## 16. Plan de desarrollo

| Fase | Contenido | Resultado |
|---|---|---|
| 0 | Proyecto base, lint, pruebas, esquemas, validador, procesado de imágenes y 10–12 recetas con imagen. | Catálogo validado en cada compilación. |
| 1 | Recorrido completo mínimo en ordenador: preferencias → menú → lista (historias A). | Utilizable de principio a fin. |
| 2 | Resto de v1: catálogo, favoritos, menús guardados, edición de lista, datos, avisos. | v1 funcional. |
| 3 | Instalación y página de instalación, sin conexión, actualización, accesibilidad, catálogo completo con imágenes y créditos. | **v1 publicada: app de ordenador instalable.** |
| 4 | Cuatro semanas de uso real y correcciones. | Criterio 14 cumplido. |
| 5 | Adaptación a móvil: navegación inferior, diseño táctil, instalación como PWA en el teléfono. | Web utilizable con comodidad en móvil. |
| 6 | Android con Capacitor. | Publicación en Google Play. |
| 7 | iOS con Capacitor. | Publicación en App Store. |

Las fases 0 a 4 son la versión de ordenador. Para no encarecer la fase 5, desde el principio se usan unidades relativas y diseño fluido, y ninguna función depende del ratón (pasar el cursor por encima nunca es la única forma de llegar a una acción).

## 17. Tiendas de aplicaciones: requisitos y costes

Las condiciones cambian; deben verificarse en las páginas oficiales justo antes de publicar.

| | Web (PWA) | Google Play | App Store |
|---|---|---|---|
| Cuota | Ninguna | Pago único de registro (25 USD) | Suscripción anual (99 USD) |
| Equipo necesario | Cualquiera | Cualquiera | Un Mac con Xcode, o un servicio de compilación en la nube con macOS |
| Requisitos destacados | Alojamiento estático | Las cuentas personales nuevas deben completar una prueba cerrada con un grupo de testers durante dos semanas antes de publicar | Revisión manual; Apple puede rechazar apps que sean solo una web empaquetada |
| Documentación | Política de privacidad | Política de privacidad, ficha de seguridad de datos, clasificación por edades | Política de privacidad, etiquetas de privacidad, clasificación por edades |

Consecuencias para el proyecto:
- El desarrollo actual es en Windows, así que la fase de iOS exige resolver antes el acceso a macOS.
- El único coste recurrente obligatorio sería la cuota anual de Apple. Un dominio propio es opcional.
- Tras la fase 5, la PWA instalable ya cubre Android e iOS sin pasar por tiendas, de modo que las fases 6 y 7 pueden posponerse sin perder funcionalidad.
- Para reducir el riesgo de rechazo en iOS conviene que la versión nativa aporte integración real: compartir la lista, guardar y abrir copias desde Archivos, funcionamiento sin conexión completo.

## 18. Riesgos y cuestiones abiertas

| Riesgo o cuestión | Tratamiento |
|---|---|
| Error en los alérgenos de un ingrediente | Derivación automática, criterio conservador con `mayContain`, revisión humana fechada, avisos visibles. |
| Catálogo insuficiente con filtros combinados | Mínimos de cobertura en el validador; avisos explicativos. |
| Pérdida de datos locales (sobre todo en iOS sin instalar) | Almacenamiento persistente, invitación a instalar, copias exportables. |
| Escribir 40–60 recetas es el trabajo más largo del proyecto | Empezar con 10–12 y ampliar por tandas; la app funciona con cualquier tamaño de catálogo. |
| No encontrar una foto abierta que coincida con cada receta | Foto propia como alternativa; también se puede elegir qué recetas entran en el catálogo teniendo en cuenta las fotos disponibles. |
| Fotos de estilos muy distintos | Criterios de selección de §13.3 y recorte uniforme a 4:3. |
| Una imagen que no corresponde a la receta, o con la licencia mal indicada en origen | Lista de licencias admitidas y datos obligatorios en el validador; revisión de cada imagen contra los ingredientes; sustitución rápida si hay reclamación. |
| La instalación solo funciona en Chrome y Edge | Instrucciones claras en la página (D13); el uso en pestaña puede habilitarse más adelante. |
| Los datos viven en el perfil del navegador y se pierden al borrar los datos del sitio | Copias exportables y fecha de la última copia visible (§11.7). |
| Las imágenes aumentan la descarga inicial | Presupuesto de peso comprobado por el validador. |
| Calidad del menú con algoritmo voraz | Pesos configurables; posible fase de mejora posterior. |
| Disponibilidad del nombre "Menú a Mano" | Comprobar marcas, dominios y tiendas antes de publicar. |
| Umbrales del reparto semanal sin validar | No se muestran como recomendación; revisión profesional antes de ampliarlos. |
| Licencia del código y del catálogo | Por decidir. |
