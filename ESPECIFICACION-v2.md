# Menú a Mano — Especificación v2

Fecha: 2026-10-11 · Estado: borrador para revisión
Parte de la [especificación v1](ESPECIFICACION.md), que sigue vigente en todo lo que este documento no cambia.

---

## 1. Resumen

La v1 es una app de ordenador para planificar el menú de la semana y generar la lista de la compra. La v2 la lleva al móvil y a más personas:

> «Organizo mis comidas y hago la compra desde el móvil».

Cuatro cambios grandes:

1. **Funciona bien en el móvil y en el navegador**, con instalación opcional.
2. **Cuenta opcional** con Google para tener los mismos datos en todos los dispositivos.
3. **Plan familiar:** una persona, el anfitrión, crea el plan e invita a las cuentas que quiera. El anfitrión crea el menú familiar de la semana (desayuno, comida y cena), que respeta las restricciones de todos, y la lista de la compra es común. Cada miembro puede además retocar su propia copia del menú; esos retoques son privados. La referencia es el plan familiar de Microsoft 365, pero gratuito.
4. **Más contenido y más control:** 70 recetas revisadas y con foto, desayunos, recetas propias, notas en las comidas y modo cocina.

La app sigue pudiendo usarse entera sin cuenta, sin conexión y sin pagar nada.

## 2. Objetivos y límites

### 2.1 Objetivos
- Toda la app es cómoda en un teléfono, incluida la compra en el supermercado.
- Quien quiera puede crear una cuenta y sincronizar; quien no, usa la app igual que en la v1.
- En un plan familiar, los cambios del anfitrión y de la lista común llegan a todos en tiempo casi real, y los retoques personales de cada uno no los ve nadie más.
- El catálogo queda cerrado: 70 recetas de comida y cena y 8 desayunos, revisados y con foto.
- Ningún dato de la v1 se pierde al actualizar.
- Lo que ya funcionaba sigue funcionando.

### 2.2 Lo que cambia respecto a los límites de la v1

| Límite de la v1 | En la v2 |
|---|---|
| Sin cuenta | **Cuenta opcional** con Google. Nunca obligatoria. |
| Los datos no salen del dispositivo | Solo salen si se crea una cuenta, y solo para sincronizar. |
| App de ordenador instalable; no se usa en pestaña | Se usa en el navegador de cualquier dispositivo; instalar es opcional. |
| Solo comida y cena | Se añaden desayunos. |
| Catálogo cerrado | Se añaden recetas propias. |
| Sin información nutricional | Se muestran las **calorías aproximadas** de cada plato, calculadas con tablas oficiales. Sin objetivos personales. |

### 2.3 Lo que se mantiene
- Gratuita, sin anuncios, sin rastreadores ni analítica.
- Sin validación profesional; el aviso de alcance se mantiene.
- No se inventan datos nutricionales: las calorías que se muestren (§9 bis) salen de tablas oficiales, con su procedencia.
- Las exclusiones y los alérgenos nunca se relajan para completar un menú.
- Sin gastos recurrentes: todo lo que se use debe caber en planes gratuitos. Única excepción: la función de IA (§13), con coste por uso acotado por un tope.

### 2.4 Fuera de la v2
- **Versión de pago.** Aplazada. La v2 no cobra nada ni reserva funciones.
- **Dietas médicas.** Descartadas por ahora. No se retomarán sin un dietista-nutricionista colegiado que las diseñe o revise.
- **Inteligencia artificial más allá de "texto a receta"** (§13): proponer menús, sustituciones, inventar recetas o dar consejos.
- Tiendas de aplicaciones, otros idiomas, importar recetas desde páginas web, recordatorios, sobras, aprovechar ingredientes, imprimir, valorar recetas.

## 3. Decisiones

### 3.1 Tomadas por el autor

| # | Decisión |
|---|---|
| E1 | Las recetas y fotos pendientes de la v1 pasan a la v2. |
| E2 | Toda la app debe funcionar bien en móvil. |
| E3 | Sincronización automática mediante cuenta opcional. |
| E4 | Uso en navegador con instalación opcional. Las tiendas quedan para después. |
| E5 | Prioridades: recetas propias, desayunos y modo cocina. Además, notas en las comidas. |
| E6 | No se quita ninguna función de la v1. |
| E7 | Entrada solo con Google. |
| E8 | Datos mínimos, en servidores de la Unión Europea, con un servicio con plan gratuito. |
| E9 | Plan familiar al estilo de Microsoft 365, sin pago: un anfitrión lo crea e invita a otras cuentas. |
| E14 | El anfitrión crea el menú familiar semanal (desayuno, comida y cena). **Los cambios globales solo los hace el anfitrión.** |
| E19 | El anfitrión dispone de unos **ajustes del plan familiar**: nombrar administradores de la familia, elegir los días y comidas del menú, y el resto de ajustes comunes (§5.8). Los administradores pueden hacer cambios globales igual que el anfitrión. |
| E20 | El anfitrión y los administradores pueden **activar o desactivar los cambios personales** de cada miembro. |
| E21 | La app muestra las calorías de los platos. Se calculan con **tablas oficiales de composición de alimentos, no con IA**. |
| E22 | Como orientación se muestra la **referencia general de 2.000 kcal diarias** para un adulto medio, la misma de las etiquetas de alimentos en la UE. La app **no pide peso, edad ni altura** y no calcula objetivos personales. |
| E23 | La v2 incluye IA para un solo uso: **convertir un texto en receta**. Es opcional, va en la última fase y tiene un tope de usos (§13). |
| E15 | Cada miembro puede retocar su propia copia del menú según sus preferencias. **Esos cambios personales no se muestran a los demás miembros**, tampoco al anfitrión. |
| E16 | Los miembros viven juntos: hay **una lista de la compra común**, hecha con el menú familiar. |
| E17 | El menú familiar evita los alérgenos y exclusiones de **todos** los miembros. |
| E18 | Si el anfitrión cambia un plato que un miembro había retocado, el miembro **conserva su cambio** y recibe un aviso con la opción de volver al del plan. |
| E10 | Las recetas propias usan los ingredientes de la app; si falta uno se añade marcando sus alérgenos. Pueden llevar foto. |
| E11 | Las recetas se comparten como archivo que otra persona importa. No se importan desde páginas web. |
| E12 | Desayunos habituales que se alternan. **70 recetas** de comida y cena (ampliado desde las 40 iniciales) más unos 8 desayunos. Las revisa el autor con una lista de comprobación. |
| E13 | Prueba con 5–10 personas cercanas mediante un enlace. Sin fecha límite. |

### 3.2 Propuestas por Claude y aceptadas por el autor

Aceptadas todas el 2026-10-11, incluida F10 (desayunos desactivados hasta que el usuario elige sus habituales).

También confirmado ese día: en el editor de recetas propias, el usuario escribe la cantidad de cada ingrediente y la app hace los cálculos posteriores (escalado por comensales, alérgenos, dieta y lista de la compra). La app no propone cantidades.

| # | Decisión | Motivo |
|---|---|---|
| F1 | Las preferencias personales pasan a ser **perfiles de comensal**. Un perfil puede estar ligado a una cuenta o no (por ejemplo, un niño). También existen sin cuenta: quien cocina para su familia puede crear varios perfiles en su dispositivo. | Es la forma más simple de cumplir E9 y cubre a quien no tiene cuenta de Google. |
| F2 | Todos los perfiles cuentan para todas las comidas. No se indica quién come cada día. | Evita complicar el planificador. El ajuste de comensales por comida ya existe. |
| F3 | Cada persona pertenece a un solo plan familiar. | Simplifica cuentas, permisos y sincronización. |
| F4 | Hay tres papeles: **anfitrión**, **administrador** y **miembro**. Un administrador puede todo lo que el anfitrión (editar el menú familiar, cambiar los ajustes del plan, invitar y expulsar miembros) salvo tres cosas reservadas al anfitrión: nombrar o quitar administradores, ceder el puesto de anfitrión y borrar el plan. | Permite repartir el trabajo, por ejemplo entre dos adultos, sin que nadie pueda dejar al anfitrión sin su plan. Confirmado por el autor. |
| F12 | En la **lista común**, cualquier miembro puede marcar lo comprado, indicar "ya lo tengo" y añadir artículos a mano. | La compra la hace quien vaya al supermercado, no necesariamente el anfitrión. |
| F13 | Los ingredientes de los retoques personales **no entran en la lista común**. Cada miembro tiene una lista privada, "Mis extras", con lo que necesitan sus cambios, calculada para una ración. La lista común no descuenta la ración del plato familiar que esa persona no tomará. | Meterlos en la lista común revelaría el cambio, que debe ser privado (E15). |
| F14 | Un retoque personal puede ser: cambiar el plato por otro, marcar "esta comida no la hago" o añadir una nota privada. | Cubre "editar según sus preferencias" sin duplicar todo el planificador. |
| F15 | El anfitrión y los administradores también tienen su copia personal: al cambiar un plato eligen entre "para todos" o "solo para mí". Sus cambios personales son tan privados como los de cualquier miembro. | Confirmado por el autor: además de administrar el plan, son miembros. |
| F16 | Al proponer un plato alternativo para un retoque personal, la app aplica solo las restricciones de esa persona, no las de todo el plan. | Le da más opciones sin riesgo para los demás, porque el plato es solo suyo. |
| F17 | Cada miembro edita su propio perfil (dieta, exclusiones, alérgenos). Los perfiles sin cuenta los gestiona el anfitrión. Los miembros ven de quién es cada restricción cuando la app explica por qué una receta no entra. | Necesario para cumplir E17; entre personas que viven juntas es información que ya se conoce. |
| F18 | Los favoritos son personales; el planificador usa los del anfitrión. | El menú familiar lo genera el anfitrión. |
| F22 | En pantalla, los perfiles de comensal se llaman **"personas"** ("Quién come en casa", "Añadir persona") y la palabra **"comensales"** se reserva para el número de raciones. | Decidido al implementar la fase 3: usar "comensales" para las dos cosas confundía. |
| F23 | Al añadir una persona, si el número de comensales por defecto es menor que el de personas, sube hasta igualarlo y se avisa. Nunca baja solo. | Una persona más en casa es, como mínimo, una ración más. |
| F19 | El permiso de cambios personales se decide **persona a persona**, con un interruptor general para activarlo o desactivarlo a todos de una vez. Por defecto está activado. | Cubre "de cada uno" y evita ir uno por uno cuando se quiere lo mismo para todos. |
| F20 | Al desactivar el permiso a alguien, sus cambios personales **no se borran**: dejan de aplicarse y esa persona ve el menú familiar tal cual, con un aviso de que la opción está desactivada. Si se vuelve a activar, reaparecen. Quien desactiva sigue sin poder ver esos cambios. | Desactivar no debe destruir nada ni romper la privacidad (E15). |
| F21 | El permiso no afecta al anfitrión ni a los administradores, que siempre pueden retocar su copia. | Ya pueden cambiar el menú de todos. |
| F5 | Las recetas propias y los menús guardados son del plan familiar: los ven todos los miembros. Cualquiera puede añadir recetas; los menús guardados los gestiona el anfitrión. | Así el anfitrión puede usar en el menú familiar las recetas de cualquiera. |
| F6 | Tiempo máximo, preferencia económica, comensales y comidas a planificar son ajustes del plan familiar. | Son decisiones de quien cocina, no restricciones personales. |
| F7 | Si dos dispositivos cambian lo mismo a la vez, gana el último cambio. Los datos se guardan en piezas pequeñas (cada comida, cada artículo) para que eso casi nunca ocurra. | El menú familiar solo lo edita el anfitrión, así que el caso real se reduce a la lista común y a una misma persona con dos dispositivos. |
| F8 | Al cerrar sesión, los datos se quedan en el dispositivo. | Coherente con "la app funciona sin cuenta". |
| F9 | Servicio de cuentas y sincronización recomendado: Supabase, con el proyecto en una región de la UE (§11.2). | Guarda cuentas y datos en la misma región y tiene plan gratuito. |
| F10 | Los desayunos están desactivados hasta que el usuario elige sus habituales. | No cambia el comportamiento de quien viene de la v1. |
| F11 | Límites: 6 cuentas por plan familiar (el anfitrión y cinco invitadas, como en la referencia), 12 perfiles, 200 recetas propias, fotos de hasta 200 KB. | Protegen el plan gratuito. |

## 4. Historias de usuario

Prioridad: **A** imprescindible, **B** importante, **C** deseable.

### 4.1 Móvil y navegador

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| V1 | Quiero usar toda la app en el móvil. | Todas las pantallas funcionan a 360 px de ancho, sin desplazamiento horizontal y con controles de al menos 44 px. | A |
| V2 | Quiero ver primero lo que toca hoy. | En móvil, el menú se abre en el día actual; los demás días están a un toque. | A |
| V3 | Quiero marcar la compra con una mano en el supermercado. | Casillas grandes, lista de una columna, lo comprado baja al final y la pantalla no se apaga mientras la lista está abierta, si el dispositivo lo permite. | A |
| V4 | Quiero usar la app en el navegador sin instalar nada. | La app se abre en una pestaña con todas sus funciones. Ya no redirige a la página de instalación. | A |
| V5 | Quiero poder instalarla si me conviene. | Botón "Instalar" donde el navegador lo permita; en iPhone, instrucciones para "Añadir a pantalla de inicio". | B |
| V6 | Quiero saber si mis datos corren riesgo en este navegador. | Si la app no está instalada ni hay cuenta, un aviso discreto explica que el navegador puede borrar los datos y ofrece instalar, crear cuenta o exportar. | B |

### 4.2 Cuenta y sincronización

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| S1 | Quiero seguir usando la app sin cuenta. | Ninguna función de la v1 exige cuenta. La cuenta se ofrece en Ajustes y en el aviso V6, nunca como paso obligatorio. | A |
| S2 | Quiero entrar con Google. | Un botón "Continuar con Google". No hay contraseñas propias de la app. | A |
| S3 | Antes de crear la cuenta quiero saber qué se guarda. | Pantalla breve con lo que se sube, dónde se guarda y cómo borrarlo, con enlace a la política de privacidad. Requiere aceptación expresa. | A |
| S4 | Al entrar por primera vez quiero conservar lo que ya tenía. | Los datos del dispositivo se suben a la cuenta. | A |
| S5 | Si entro en un segundo dispositivo que ya tiene datos, quiero decidir. | La app pregunta qué conservar (los de la cuenta o los de este dispositivo) y guarda antes una copia local de lo que se va a sustituir. | A |
| S6 | Quiero que los cambios lleguen solos a mis otros dispositivos. | Con conexión, un cambio aparece en otro dispositivo en menos de 10 segundos, sin pulsar nada. | A |
| S7 | Quiero seguir trabajando sin conexión. | Todo funciona sin red; los cambios se envían al recuperarla. Un indicador muestra "sincronizado", "pendiente" o "sin conexión". | A |
| S8 | Quiero cerrar sesión sin perder nada. | Los datos siguen en el dispositivo y en la cuenta. | B |
| S9 | Quiero borrar mi cuenta y mis datos. | Desde Ajustes, con confirmación. Elimina la cuenta y sus datos del servidor. Los del dispositivo se conservan o se borran, a elección. | A |

### 4.3 Plan familiar y perfiles

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| H1 | Quiero un perfil para cada persona que come en casa. | Cada perfil tiene nombre, dieta, exclusiones y alérgenos. Se pueden crear sin cuenta. | A |
| H2 | Quiero que el menú respete a todos. | Las restricciones obligatorias son la suma de las de todos los perfiles (§8.1). Ningún plato incumple la de nadie. | A |
| H3 | Quiero saber por qué una receta no entra. | El motivo nombra a la persona: "no apta para Ana (gluten)". | B |
| H0 | Quiero crear un plan familiar. | Desde Ajustes, con cuenta. Quien lo crea es el anfitrión. Sus datos actuales pasan a ser los del plan. | A |
| H4 | Como anfitrión, quiero invitar a las cuentas que quiera. | Se genera un enlace o código de invitación que caduca a los 7 días. Quien lo abre entra con su cuenta de Google y se une. Solo el anfitrión puede invitar, hasta el límite de F11. | A |
| H5 | Al unirme quiero enlazar mi cuenta con mi perfil. | Si ya existía un perfil para esa persona, se puede enlazar; si no, se crea uno. | B |
| H6 | Quiero ver al momento los cambios del anfitrión y de la lista común. | Un cambio en el menú familiar o un artículo marcado en la lista común se ve en los demás dispositivos en menos de 10 segundos, con conexión. | A |
| H7 | Quiero salir de un plan familiar, o expulsar a alguien si soy el anfitrión. | Quien sale deja de ver los datos del plan. Si sale el anfitrión, el miembro más antiguo pasa a serlo. | B |
| H9 | Quiero ver quién forma parte del plan. | Lista de miembros con su nombre y su papel: anfitrión, administrador o miembro. | B |
| H10 | Como anfitrión, quiero nombrar administradores de la familia. | Desde los ajustes del plan, el anfitrión da o quita el papel de administrador a cualquier miembro con cuenta. El cambio se aplica al momento. | B |
| H11 | Como anfitrión o administrador, quiero elegir los días y comidas que cubre el menú. | Cuadrícula de 7 días por desayuno, comida y cena. Lo desmarcado queda sin planificar para todos. | A |
| H13 | Como anfitrión o administrador, quiero decidir quién puede hacer cambios personales. | En los ajustes del plan, un interruptor por miembro y uno general. El cambio se aplica al momento en el dispositivo de esa persona. | B |
| H14 | Como miembro, quiero saber si puedo hacer cambios personales. | Si la opción está desactivada, no veo "Cambiar para mí" y un texto me explica que la ha desactivado quien administra el plan. | B |
| H12 | Como anfitrión, quiero ceder el puesto a otro miembro. | Elige a un miembro con cuenta y confirma. El anterior anfitrión pasa a ser administrador. | C |

### 4.3 bis Menú familiar y copia personal

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| M1 | Como anfitrión o administrador, quiero crear y cambiar el menú familiar. | Generar, cambiar, bloquear, elegir, mover y vaciar platos, como en la v1. Los cambios llegan a todos los miembros. | A |
| M2 | Como miembro, quiero ver el menú familiar en mi dispositivo. | Lo veo completo y al día, pero sin las acciones que lo modifican para todos. | A |
| M3 | Como miembro, quiero cambiar un plato solo para mí. | "Cambiar para mí" propone una alternativa compatible con mis restricciones, o me deja elegirla. El plato queda señalado como "Cambio tuyo". | A |
| M4 | Quiero indicar que una comida no la hago. | "Esta comida no la hago" la marca así solo en mi copia. | B |
| M5 | Quiero que mis cambios sean privados. | Ningún otro miembro, tampoco el anfitrión, puede ver mis cambios. Lo garantiza el servidor, no solo la app. | A |
| M6 | Quiero deshacer mis cambios. | "Volver al del plan" en cada comida, y "Quitar todos mis cambios" para la semana. | A |
| M7 | Si el anfitrión cambia un plato que yo había retocado, quiero enterarme sin perder lo mío. | Conservo mi plato y veo "El plan ahora propone X", con las opciones "Usar el del plan" y "Mantener el mío". | A |
| M8 | Quiero comparar mi menú con el familiar. | Un conmutador "Mi menú / Menú familiar" en la pantalla del menú. | B |
| M9 | Como anfitrión o administrador, quiero elegir si un cambio es para todos o solo para mí. | Al cambiar un plato se ofrecen las dos opciones; por defecto, "para todos". | B |
| M10 | Quiero saber qué comprar para mis cambios. | La lista "Mis extras", privada, reúne los ingredientes de mis platos cambiados. | B |
| M11 | Quiero cocinar y consultar siempre mi versión. | El modo cocina, el detalle de receta y "hoy" usan mi menú: el familiar con mis cambios. | A |
| H8 | Al unirme a otro plan familiar no quiero perder mis recetas propias. | La app ofrece llevarlas al plan familiar nuevo. | C |

### 4.4 Desayunos

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| D1 | Quiero elegir mis desayunos habituales. | Entre 1 y 3, del catálogo o propios. | A |
| D2 | Quiero que se alternen solos durante la semana. | Al generar el menú se reparten por turnos entre los días activos. | A |
| D3 | Quiero cambiar el desayuno de un día concreto. | Las mismas acciones que en comida y cena. | B |
| D4 | Quiero que sus ingredientes entren en la compra. | Se suman a la lista con las reglas habituales. | A |
| D5 | No quiero desayunos si no los uso. | Sin habituales elegidos, la fila de desayunos no aparece. | A |

### 4.5 Recetas propias

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| R1 | Quiero añadir una receta mía. | Formulario con nombre, tipo de comida, raciones, tiempos, ingredientes, pasos y notas. Se guarda como borrador hasta que esté completa. | A |
| R2 | Quiero elegir los ingredientes de la lista de la app. | Buscador sobre el catálogo, con cantidad y unidad. La dieta y los alérgenos de la receta se calculan solos. | A |
| R3 | Si falta un ingrediente, quiero añadirlo. | Pide nombre, sección, unidad, dieta y alérgenos. Hay que elegir expresamente los alérgenos o "ninguno de los 14"; no hay valor por defecto. | A |
| R4 | Quiero que mis recetas entren en el menú automático. | Activado por defecto y desactivable por receta. Pasan por los mismos filtros que las del catálogo. | A |
| R5 | Quiero editarlas y borrarlas. | Una receta borrada que está en un menú se muestra como "Receta no disponible", igual que en la v1. | A |
| R6 | Quiero ponerles foto. | Desde la cámara o la galería. Se recorta a 4:3 y se reduce en el propio dispositivo. | B |
| R7 | Quiero pasarle una receta a alguien. | "Exportar" genera un archivo. Si hay menú nativo de compartir, se usa. | B |
| R8 | Quiero importar una receta que me han pasado. | Antes de guardarla se muestran sus ingredientes y alérgenos para revisarlos. Queda marcada como "importada". Un archivo dañado o de una versión posterior se rechaza con explicación. | B |
| R9 | Quiero distinguir mis recetas de las del catálogo. | Etiqueta "Propia" o "Importada" y filtro en el listado. | B |
| R10 | Quiero pegar una receta como texto y que el editor se rellene solo. | "Rellenar desde un texto" devuelve un borrador en el editor. Los ingredientes sin identificar y las cantidades dudosas quedan señalados. Nada se guarda sin revisarlo. Requiere cuenta y conexión (§13). | C |
| R11 | Quiero saber qué se envía fuera y cuántos usos me quedan. | Aviso antes del primer uso y contador de usos restantes del mes. Al agotarse, la app lo explica y el editor manual sigue disponible. | C |

### 4.6 Notas y modo cocina

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| N1 | Quiero añadir una nota a una comida. | Texto de hasta 80 caracteres, con sugerencias rápidas ("Llevar al trabajo", "Invitados", "Fuera de casa"). Se ve en la tarjeta de la comida. | A |
| N2 | Quiero que la nota no se pierda al cambiar el plato. | La nota pertenece a la comida, no a la receta. | B |
| C1 | Quiero cocinar siguiendo los pasos en grande. | Pantalla completa, un paso cada vez, texto grande y botones "Anterior" y "Siguiente". | A |
| C2 | Quiero repasar los ingredientes antes de empezar. | Primera pantalla con los ingredientes ya ajustados a los comensales, con casillas. | A |
| C3 | No quiero que la pantalla se apague mientras cocino. | Se mantiene encendida donde el dispositivo lo permita. | B |
| C4 | Quiero abrirlo desde el menú del día. | Acceso desde la tarjeta de la comida y desde el detalle de la receta. Usa los comensales de esa comida. | B |

### 4.7 Catálogo

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| K1 | Quiero un catálogo suficiente y variado. | 70 recetas de comida y cena y 8 desayunos, con la cobertura de §9.2. | A |
| K2 | Quiero poder fiarme de los alérgenos del catálogo. | Todas las recetas tienen fecha de revisión, hecha con la lista de §9.3. El aviso de "borrador" desaparece. | A |
| K3 | Quiero ver una foto de cada plato. | Todas las recetas del catálogo tienen foto con licencia abierta y atribución visible. | A |

### 4.8 Prueba con otras personas

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| T1 | Quiero que 5–10 personas la prueben con un enlace. | No se comparte el enlace hasta cumplir §12.3. | A |
| T2 | Quiero que me cuenten qué falla. | Enlace "Enviar comentarios" en Ajustes que abre un correo al autor. Sin analítica. | B |

## 5. Pantallas

### 5.1 Navegación
- **Móvil:** barra inferior con Menú, Recetas, Compra y Ajustes.
- **Ordenador:** barra lateral, como en la v1.

### 5.2 Página de entrada
La antigua página de instalación pasa a tener dos acciones: **Abrir Menú a Mano** (principal) e **Instalar** (secundaria, donde se pueda).

### 5.3 Menú
- **Móvil:** un día por pantalla, empezando por hoy, con desayuno, comida y cena en vertical y una tira de días para saltar de uno a otro.
- **Ordenador:** la cuadrícula semanal de la v1, con una fila más para desayunos si están activos.
- Cada tarjeta muestra además la nota y el acceso al modo cocina.
- **En un plan familiar:**
  - El anfitrión y los administradores ven las acciones de la v1; al cambiar un plato eligen "para todos" o "solo para mí".
  - Un miembro ve "Cambiar para mí", "Esta comida no la hago" y "Volver al del plan", pero no las acciones que cambian el menú de todos.
  - Los platos retocados llevan la etiqueta "Cambio tuyo"; si el plan ha cambiado después, también el aviso "El plan ahora propone X".
  - Conmutador "Mi menú / Menú familiar".

### 5.4 Recetas
- Botón **Nueva receta** y filtro por origen (catálogo, propias, importadas).
- Detalle con las acciones **Cocinar**, **Editar** y **Exportar** (las dos últimas, solo en recetas propias).

### 5.5 Editor de receta
Formulario en secciones: datos básicos, ingredientes, pasos, foto. Guarda solo. Muestra en todo momento la dieta y los alérgenos calculados.

### 5.6 Modo cocina
Pantalla completa sin navegación: ingredientes, después los pasos uno a uno, indicador "Paso 3 de 5" y botón para salir.

### 5.7 Compra
Como en la v1, en una sola columna en móvil. En un plan familiar:
- La lista es **común** y se calcula con el menú familiar. Cada artículo marcado indica quién lo marcó.
- Debajo, la sección privada **Mis extras**, con los ingredientes de los cambios personales. Solo la ve su dueño.

### 5.8 Ajustes
- **Comensales:** lista de perfiles, con alta, edición y baja.
- **Plan familiar** (requiere cuenta): crear un plan, ver miembros y salir. El anfitrión y los administradores ven además los **ajustes del plan**:
  - Nombre del plan.
  - Miembros: invitar, expulsar y, solo el anfitrión, nombrar administradores.
  - Cambios personales: activarlos o desactivarlos para cada miembro, o para todos a la vez.
  - Días y comidas que cubre el menú.
  - Desayunos habituales.
  - Tiempo máximo por receta y preferencia por recetas económicas.
  - Número de comensales por defecto.
  - Perfiles de comensal sin cuenta.
  - Solo el anfitrión: ceder el puesto y borrar el plan.
- **Cuenta:** entrar o salir, estado de sincronización, borrar cuenta.
- **Menú:** tiempo máximo, preferencia económica, comidas a planificar, desayunos habituales.
- **Datos**, **Apariencia** y **Acerca de**, como en la v1.

### 5.9 Configuración inicial
Los mismos tres pasos; el primero crea el primer perfil. Al final se ofrece, sin obligar, elegir desayunos y crear cuenta.

## 6. Modelo de datos

### 6.1 Cambios respecto a la v1

```ts
type MealType = 'breakfast' | 'lunch' | 'dinner';

// Sustituye a la parte personal de Preferences
interface DinerProfile {
  id: string;
  name: string;
  diet: Diet;
  excludedIngredientIds: string[];
  excludedGroups: IngredientGroup[];
  excludedAllergens: Allergen[];
  linkedUserId?: string;        // cuenta enlazada, si la hay
}

// Sustituye a la parte común de Preferences
interface HouseholdSettings {
  servings: number;
  maxTotalMinutes: number | null;
  preferBudget: boolean;
  activeSlots: boolean[][];     // [día 0–6][desayuno, comida, cena]
  habitualBreakfastIds: string[]; // 0–3; vacío = sin desayunos
  onboardingDone: boolean;
}

interface MealSlot {
  // …campos de la v1…
  note?: string;                // hasta 80 caracteres
}

interface WeekPlan {
  // …campos de la v1…
  slots: MealSlot[];            // 21: 7 días × 3 comidas
}

interface CustomIngredient extends Ingredient {
  custom: true;
  allergensConfirmed: true;     // el usuario los eligió expresamente
}

interface UserRecipe extends Recipe {
  origin: 'own' | 'imported';
  status: 'draft' | 'ready';    // los borradores no entran en menús
  includeInPlanner: boolean;
  photo?: { width: number; height: number; bytes: number };
}
```

Los identificadores de recetas e ingredientes propios llevan un prefijo (`u-`) para que nunca coincidan con los del catálogo.

### 6.2 Datos de sincronización
Todo registro sincronizable añade:

```ts
interface Syncable {
  id: string;
  householdId: string;
  updatedAt: string;   // lo fija el servidor
  updatedBy?: string;
  deletedAt?: string;  // borrado lógico, para que el borrado también se propague
}
```

Los cambios personales son registros aparte, que solo puede leer su dueño:

```ts
interface PersonalMealChange extends Syncable {
  userId: string;               // dueño; nadie más puede leerlo
  weekStart: string;
  day: number;
  mealType: MealType;
  kind: 'replace' | 'skip';
  recipeId?: string;            // con 'replace'
  note?: string;                // nota privada
  baseRecipeId: string | null;  // plato del plan cuando se hizo el cambio; sirve para avisar si el plan cambia
}
```

Cada miembro del plan tiene además un papel y un permiso:

```ts
interface PlanMember extends Syncable {
  userId: string;
  role: 'host' | 'admin' | 'member';
  personalChangesAllowed: boolean; // lo cambian el anfitrión y los administradores
}
```

El menú que ve cada persona se calcula: para cada comida, su cambio personal si existe y tiene el permiso activado; si no, el plato del menú familiar.

Se sincronizan por piezas: cada comida del menú, cada cambio personal, el estado de cada artículo de la lista, cada artículo manual, cada favorito, cada menú guardado, cada perfil, cada receta e ingrediente propios, y los ajustes del plan familiar.

### 6.3 Archivo de receta

```json
{
  "app": "menu-a-mano",
  "kind": "recipe",
  "schemaVersion": 1,
  "recipe": {},
  "customIngredients": []
}
```

Incluye los ingredientes propios que la receta necesita. Los del catálogo viajan solo como identificador.

### 6.4 Migración desde la v1
- Automática al abrir la v2, sin intervención.
- `Preferences` se divide en un `DinerProfile` y un `HouseholdSettings`.
- Cada menú pasa de 14 a 21 comidas; los desayunos quedan inactivos.
- Las copias de seguridad de la v1 se siguen pudiendo importar.
- Antes de migrar se guarda una copia local de los datos anteriores.

## 7. Cuentas, planes familiares y sincronización

### 7.1 Principio
La app es **local primero**: siempre lee y escribe en el dispositivo. La cuenta añade una copia en el servidor que se mantiene al día en segundo plano. Sin cuenta no hay ninguna comunicación con el servidor.

### 7.2 Cuenta
- Entrada con Google. Del perfil de Google solo se guardan el identificador, el correo y el nombre.
- Una cuenta que no ha creado un plan familiar ni se ha unido a uno funciona sola, con sus propios datos. Por dentro se trata como un plan de una sola persona, de modo que crear un plan o invitar a alguien no obliga a mover datos.

### 7.3 Plan familiar
- Invitación por enlace o código, válida 7 días.
- Al unirse a otro plan familiar se deja el anterior. Si era el único miembro, la app avisa de que sus datos se borrarán y ofrece exportarlos o llevarse las recetas propias.
- Solo los miembros pueden leer los datos de su plan familiar; lo garantiza el servidor, no solo la app.

Quién puede cambiar qué, también garantizado por el servidor:

| Dato | Lo cambia | Lo ve |
|---|---|---|
| Menú familiar, ajustes del plan, menús guardados | El anfitrión y los administradores | Todos los miembros |
| Miembros e invitaciones | El anfitrión y los administradores | Todos los miembros |
| Papeles (quién es administrador), cesión y borrado del plan | Solo el anfitrión | Todos los miembros |
| Permiso de cambios personales de cada miembro | El anfitrión y los administradores | Todos los miembros |
| Lista de la compra común | Cualquier miembro | Todos los miembros |
| Recetas e ingredientes propios | Quien los creó; el anfitrión puede borrarlos | Todos los miembros |
| Perfil de comensal | Su dueño; los perfiles sin cuenta, el anfitrión | Todos los miembros |
| Cambios personales, "Mis extras", favoritos | Su dueño | **Solo su dueño** |

### 7.4 Sincronización
- Los cambios hechos sin conexión se guardan en una cola y se envían al volver.
- Conflictos: gana el cambio con fecha de servidor más reciente, registro a registro (F7).
- Los cambios de otros dispositivos llegan por un canal en tiempo real, con consulta periódica como respaldo.
- Si el servidor no está disponible, la app sigue funcionando y lo indica.

### 7.5 Fotos de recetas propias
Se reducen en el dispositivo a un máximo de 960 px y 200 KB antes de guardarse. Con cuenta, se suben al almacenamiento del plan familiar.

## 8. Planificador

### 8.1 Restricciones del plan familiar
Las restricciones obligatorias se calculan a partir de todos los perfiles:
- **Dieta:** la más restrictiva. Si alguien es vegano, el menú es vegano.
- **Ingredientes, grupos y alérgenos excluidos:** la suma de los de todos.
- **Tiempo máximo:** el del plan familiar.

El aviso del "filtro que más limita" (v1 §9.5) nombra además a la persona cuando la causa son las restricciones de un perfil.

### 8.1 bis Cambios personales
- "Cambiar para mí" usa las mismas reglas de sustitución que la v1, pero solo con las restricciones de esa persona (F16) y sin alterar el menú familiar.
- Regenerar el menú familiar no borra los cambios personales: siguen ligados a su día y comida, y se avisa si el plato del plan ya no es el mismo (E18).
- Si un cambio personal apunta a una receta que deja de existir, se muestra como "Receta no disponible" y se ofrece volver al del plan.

### 8.2 Desayunos
- No pasan por el algoritmo de variedad. Los habituales se reparten por turnos entre los días activos.
- Si un desayuno habitual deja de cumplir las restricciones, no se asigna y se avisa.
- Los desayunos no cuentan para el reparto semanal ni para la alternancia de comida y cena.

### 8.3 Recetas propias
Compiten con las del catálogo en igualdad de condiciones. Los borradores y las que tengan desactivado "incluir en menús automáticos" no se proponen.

## 9. Catálogo

### 9.1 Contenido
- 70 recetas de comida y cena (hoy hay 25) y 8 desayunos.
- Todas con foto de licencia abierta, según las reglas de la v1 (§13.3).
- Se completa el procesado de imágenes pendiente de la v1.

### 9.2 Cobertura mínima

| Requisito | Mínimo |
|---|---|
| Recetas veganas de comida o cena | 20 |
| Recetas vegetarianas (incluye veganas) | 35 |
| Recetas de 30 min o menos | 30 |
| Recetas aptas para cena | 35 |
| Recetas sin gluten | 25 |
| Recetas de coste 1 | 25 |
| Recetas con legumbres como grupo principal | 10 |
| Desayunos veganos | 3 |
| Desayunos sin gluten | 3 |

### 9.3 Lista de comprobación para revisar una receta
1. Los ingredientes de la lista son todos los que nombran los pasos, y al revés.
2. Las cantidades son razonables para las raciones indicadas.
3. Cada ingrediente tiene bien marcados su dieta, sus alérgenos y sus posibles trazas.
4. La dieta y los alérgenos que calcula la app para la receta son los esperados.
5. Los tiempos son realistas.
6. La foto corresponde al plato y no muestra ingredientes que la receta no lleva.
7. La foto tiene licencia admitida, con autor y enlace registrados.

Al completarla se anota la fecha en la receta. El validador pasa a exigirla: una receta sin revisar impide compilar.

## 9 bis. Calorías

Decidido por el autor el 2026-10-11.

### Datos
- Cada ingrediente del catálogo lleva, por 100 g o por 100 ml, sus kilocalorías, proteínas, grasas e hidratos, tomados de una tabla oficial y con la fuente anotada.
- Se recogen los cuatro datos, pero **la app solo muestra las calorías**. Los otros tres quedan guardados por si más adelante se decide mostrarlos.
- Los ingredientes propios tienen un campo opcional para copiar las calorías de la etiqueta del producto.

### Cálculo
- Las calorías de una receta son la suma de las de sus ingredientes, repartida entre sus raciones.
- Los ingredientes "al gusto" o sin cantidad no suman.
- Si a algún ingrediente con cantidad le falta el dato, la receta muestra "calorías no disponibles" en lugar de una cifra incompleta.

### Presentación
- Siempre como valor aproximado y por ración: "unas 520 kcal".
- Se ven en el detalle de la receta, en la tarjeta de cada comida del menú y como total de lo planificado en cada día. No hay total semanal.
- El total del día se presenta así, para que no engañe: "Planificado hoy: unas 1.200 kcal. Referencia para un adulto: 2.000 kcal al día, contando todo lo que se come y se bebe."
- En la copia personal de un miembro se calculan con sus platos cambiados.
- Interruptor "Mostrar calorías" en Ajustes, **encendido por defecto**. Es personal de cada dispositivo.
- No hay objetivos, ni colores de "te has pasado", ni mensajes que juzguen. La app no pide peso, edad ni altura (E22).
- Junto a las calorías, un aviso breve: son orientativas y dependen de las marcas y de la forma de cocinar.

### Pendiente
- Qué tabla oficial se usa, tras comprobar sus condiciones de uso.

## 10. Privacidad

- Sin cuenta, nada cambia respecto a la v1.
- Con cuenta se guardan en el servidor: correo, nombre, perfiles de comensal (incluidos alérgenos y exclusiones), menús, listas, favoritos y recetas propias con sus fotos.
- **Las exclusiones y los alérgenos pueden revelar información de salud.** Por eso la cuenta requiere consentimiento expreso (S3) y los perfiles sin cuenta enlazada los gestiona quien los crea.
- Servidores en la Unión Europea (E8).
- Política de privacidad pública antes de admitir la primera cuenta, con qué se guarda, para qué, dónde, durante cuánto tiempo y cómo borrarlo.
- Derecho a exportar y a borrar: desde Ajustes, sin tener que pedirlo.
- Sigue sin haber anuncios, analítica ni cesión de datos.
- La función de IA envía a un servicio externo únicamente el texto que la persona pega, tras avisarla; no se envían perfiles, alérgenos ni menús (§13.3).
- El autor pasa a ser responsable de datos personales de otras personas. Conviene que alguien con conocimientos de protección de datos revise la política antes de abrir la app a más gente que el grupo de prueba.

## 11. Arquitectura

### 11.1 Lo que se conserva
Capas, tecnologías y reglas de la v1. Todo el acceso a datos sigue pasando por los repositorios, que es donde se engancha la sincronización.

### 11.2 Lo que se añade
- **Servicio de cuentas y datos:** Supabase (F9): entrada con Google, base de datos con permisos por plan familiar, canal en tiempo real y almacenamiento de fotos.
  - Las condiciones del plan gratuito deben comprobarse antes de empezar. En particular, los proyectos gratuitos sin actividad pueden quedar en pausa; como la app es local primero, eso solo retrasaría la sincronización.
  - Al estar tras los repositorios, cambiar de servicio no afectaría a las pantallas.
- **Módulo de sincronización** (`src/sync/`): cola de cambios, envío, recepción y resolución de conflictos. Lógica pura y probada aparte de la red.
- **Editor de recetas** y **modo cocina** en `src/ui/`.
- **Diseño adaptable:** una sola base de estilos, pensada primero para móvil.

### 11.3 Lo que se retira
- La redirección que impedía usar la app en una pestaña.

### 11.4 Deuda de la v1 que se salda
- Pruebas de recorrido completo y de accesibilidad automatizadas (Playwright y axe).
- Script de procesado de imágenes.
- Regla de lint que protege las capas.

## 12. Calidad

### 12.1 Pruebas

| Ámbito | Qué se comprueba |
|---|---|
| Regresión | Todas las pruebas de la v1 siguen pasando. |
| Migración | Datos reales de la v1 se convierten sin pérdidas; las copias antiguas se importan. |
| Planificador | Con perfiles aleatorios, ningún plato incumple la restricción de ningún perfil. Los desayunos se reparten por turnos. |
| Recetas propias | Dieta y alérgenos calculados; exportar e importar de ida y vuelta; rechazo de archivos inválidos. |
| Sincronización | Dos dispositivos simulados convergen al mismo estado tras ediciones sin conexión, en cualquier orden. |
| Permisos | Una cuenta no puede leer ni escribir datos de un plan familiar al que no pertenece. Un miembro no puede modificar el menú familiar. Nadie, tampoco el anfitrión, puede leer los cambios personales de otro. |
| Menú personal | El menú de cada persona es el familiar con sus cambios encima. Al cambiar el plan, el cambio personal se conserva y se genera el aviso. "Mis extras" contiene solo ingredientes de cambios personales. |
| Recorridos | Los de la v1, más: crear receta y verla en el menú, modo cocina, invitar y unirse a un plan familiar. En tamaño de móvil y de ordenador. |
| Accesibilidad | axe sin errores en todas las pantallas, también en móvil. |

### 12.2 Criterios de aceptación de la v2
1. Los datos de una instalación de la v1 siguen intactos tras actualizar.
2. Todas las funciones de la v1 siguen funcionando.
3. Todo el recorrido se completa en un móvil de 360 px de ancho.
4. La app se usa en una pestaña del navegador sin instalar.
5. Sin cuenta, la app no hace ninguna petición a servidores de datos.
6. Con cuenta, un cambio llega a otro dispositivo en menos de 10 segundos.
7. Tras editar sin conexión en dos dispositivos, ambos acaban con los mismos datos.
8. Ningún menú incumple la restricción de ningún perfil del plan familiar.
9. Una receta propia aparece en el menú, respeta los filtros y suma a la compra.
10. Una receta exportada e importada conserva ingredientes, cantidades y alérgenos.
11. El catálogo tiene 70 recetas y 8 desayunos, todos revisados y con foto atribuida.
12. La cuenta se puede borrar desde la app y sus datos desaparecen del servidor.
13. En un plan familiar, solo el anfitrión y los administradores pueden cambiar el menú de todos, y solo el anfitrión puede nombrar administradores.
14. El cambio personal de un miembro no aparece en el dispositivo de ningún otro miembro ni en la lista común.
15. Si el anfitrión cambia un plato retocado por un miembro, este conserva su cambio y recibe el aviso.
16. Al desactivar los cambios personales de un miembro, este ve el menú familiar sin sus retoques; al reactivarlos, los recupera.
17. Las calorías de una receta coinciden con el cálculo manual a partir de las tablas, y cada valor tiene su fuente anotada.
18. Un texto pegado se convierte en un borrador de receta que la persona revisa antes de guardar; al alcanzar el tope de usos, la función se desactiva y la app lo explica.

### 12.3 Antes de compartir el enlace con otras personas
- Criterios 1 a 18 cumplidos.
- Política de privacidad publicada.
- Aviso de "catálogo en borrador" retirado porque ya no aplica.
- Enlace de comentarios funcionando.

## 13. Inteligencia artificial: de texto a receta

Decidido por el autor: la v2 incluye **un único uso de IA**, convertir un texto en una receta, como última fase de desarrollo. El recuento de calorías, que era la idea inicial, se resuelve sin IA (§9 bis).

### 13.1 Qué hace
En el editor de recetas, un botón "Rellenar desde un texto" permite pegar o escribir una receta tal cual se tiene. La IA devuelve los campos del editor ya rellenos: nombre, raciones, tiempos, ingredientes con cantidad y unidad, y pasos.

### 13.2 Reglas
- **La IA propone y la persona decide.** El resultado se abre en el editor como borrador; nada se guarda hasta revisarlo y aceptarlo.
- **La IA no decide sobre alérgenos ni dieta.** Solo empareja cada ingrediente del texto con uno de la lista de la app; alérgenos y dieta se calculan después como en cualquier receta.
- Un ingrediente que no encaja con ninguno de la app queda marcado como "sin identificar". La persona elige uno existente o crea uno propio marcando sus alérgenos (R3).
- Las cantidades dudosas ("un puñado", "al gusto") se marcan para revisarlas, en lugar de inventar una cifra.
- La IA no inventa recetas, no propone menús y no da consejos de alimentación.

### 13.3 Condiciones
- **Opcional.** El editor manual funciona siempre, con o sin IA.
- **Requiere cuenta y conexión.** La clave del servicio de IA vive en el servidor, nunca dentro de la app.
- **Tiene coste por uso,** que asume el autor. Es la única excepción a "sin gastos recurrentes" (§2.3). Para acotarlo:
  - un tope de usos por persona y mes;
  - un presupuesto mensual total; al agotarse, la función se desactiva hasta el mes siguiente y la app lo explica.
- **Transparencia.** Antes del primer uso se avisa de que el texto se envía a un servicio externo de IA. No se envía ningún otro dato: ni perfiles, ni alérgenos, ni menús.
- El texto no se guarda en el servidor después de convertirlo.

### 13.4 Decidido por el autor
- **Solo texto.** Ni foto ni dictado por voz en la v2; la foto puede añadirse si se echa en falta en la prueba.
- **Presupuesto total: 5 € al mes.** Al agotarse, la función se desactiva hasta el mes siguiente.
- El autor abrirá la cuenta de pago por uso con el proveedor de IA al llegar a esa fase.

### 13.4 bis Pendiente
- El tope de usos por persona y mes. Propuesta: 20, a ajustar cuando se conozca el coste real por uso.
- El servicio de IA concreto y su coste real, que se comprobará al llegar a esa fase.

### 13.5 Usos descartados para la v2
Proponer menús a partir de una frase, sugerir sustituciones, inventar recetas y cualquier forma de chat con consejos.

## 14. Plan de desarrollo

| Fase | Contenido | Resultado |
|---|---|---|
| 0 | Deuda de la v1: pruebas de recorrido, procesado de imágenes, lint. Lista de comprobación de recetas. | Red de seguridad antes de tocar nada. |
| 1 | Móvil y navegador: diseño adaptable, navegación inferior, uso en pestaña, página de entrada. | La v1 entera, usable en el teléfono. |
| 2 | Notas, modo cocina y desayunos. Migración de datos a la v2. | Primeras novedades visibles. |
| 3 | Perfiles de comensal y planificador para varios perfiles. | Menú que respeta a toda la casa, aún sin cuentas. |
| 4 | Recetas propias: editor, ingredientes propios, foto, exportar e importar. | Catálogo ampliable por el usuario. |
| 5 | Catálogo: hasta 70 recetas y 8 desayunos, fotos y revisión, por tandas de unas 10. | Catálogo cerrado. Avanza en paralelo desde la fase 0; cada tanda puede publicarse al terminarla. |
| 6 | Cuenta con Google y sincronización entre dispositivos de una persona. | Mismos datos en móvil y ordenador. |
| 7 | Planes familiares: crear, invitar y unirse; menú familiar del anfitrión y lista común en tiempo real. | Menú familiar y lista compartidos. |
| 7 bis | Copia personal: cambios privados, avisos cuando cambia el plan y "Mis extras". | Cada miembro con su versión del menú. |
| 8 | IA de texto a receta, con topes de uso. | Crear recetas propias pegando un texto. |
| 9 | Política de privacidad, repaso final y prueba con 5–10 personas. | v2 publicada. |

Las fases 1 a 5 no necesitan servidor y cada una puede publicarse por separado. Las cuentas van al final a propósito: es la parte más compleja y conviene que el modelo de datos ya no cambie.

## 15. Riesgos y cuestiones abiertas

| Riesgo o cuestión | Tratamiento |
|---|---|
| La sincronización es, con diferencia, lo más difícil de la v2 | Va al final, con lógica pura y pruebas de convergencia. La app nunca depende de ella para funcionar. |
| Un ingrediente propio con los alérgenos mal marcados | Elección expresa obligatoria, etiqueta "Propia" visible y revisión al importar. |
| Datos sensibles de otras personas en un servidor | Datos mínimos, UE, consentimiento expreso, borrado desde la app, permisos en el servidor. |
| Cambios en las condiciones del plan gratuito | Servicio aislado tras los repositorios; la app funciona sin él. |
| La lista común puede comprar de más: no descuenta la ración del plato familiar que alguien ha cambiado en privado | Es el precio de mantener privados los cambios (F13). Revisar tras la prueba con personas reales. |
| Dos capas de menú (familiar y personal) pueden confundir | Etiqueta "Cambio tuyo", conmutador "Mi menú / Menú familiar" y textos claros; es uno de los puntos que observar en la prueba. |
| Un perfil muy restrictivo deja al plan familiar con pocas recetas | Avisos que nombran la causa; las recetas propias amplían las opciones. |
| iPhone borra los datos de webs no instaladas | Aviso V6; la cuenta lo resuelve. |
| Pasar de 25 a 70 recetas, más 8 desayunos, supone 53 recetas nuevas que escribir, ilustrar con foto y revisar una a una | Es el trabajo manual más largo de la v2 y la revisión recae en el autor. Fase propia, en paralelo, por tandas de unas 10. La app funciona con el catálogo que haya en cada momento. |
| Configurar la entrada con Google requiere una cuenta de desarrollador de Google (gratuita) | La crea el autor; se documentan los pasos. |
| La IA interpreta mal una receta (cantidad o ingrediente equivocado) | Siempre se revisa en el editor antes de guardar; lo dudoso se señala; los alérgenos no dependen de la IA. |
| El coste de la IA se dispara | Tope por persona y presupuesto mensual total; al agotarse, se desactiva sola. |
| Versión de pago y dietas médicas | Fuera de la v2 (§2.4). |
