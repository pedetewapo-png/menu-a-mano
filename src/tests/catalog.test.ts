import { describe, expect, it } from 'vitest';
import { catalog } from '../data/catalog';
import { veganLabelChecks } from '../domain/catalog';
import { isUsableUnit } from '../domain/units';
import { formatRecipeIngredient } from '../ui/format';

const checks = (recipeId: string) =>
  veganLabelChecks(catalog.recipeById.get(recipeId)!, catalog.ingredients).map((i) => i.id);

describe('catálogo revisado', () => {
  it('todas las recetas de la app tienen fecha de revisión', () => {
    expect(catalog.recipes.filter((r) => !r.reviewedOn).map((r) => r.id)).toEqual([]);
  });

  it('ninguna receta usa un ingrediente compuesto que esconda otros a las exclusiones', () => {
    // La menestra congelada lleva guisantes, judías o coliflor según la marca: quien excluye
    // uno de ellos no puede recibirla sin saberlo. Las recetas nombran cada verdura.
    const users = catalog.recipes.filter((r) => r.ingredients.some((i) => i.ingredientId === 'menestra-congelada'));
    expect(users.map((r) => r.id)).toEqual([]);
  });

  it('las cantidades de todas las recetas se pueden convertir a la unidad de compra', () => {
    for (const recipe of catalog.recipes) {
      for (const item of recipe.ingredients) {
        expect(isUsableUnit(catalog.ingredients.get(item.ingredientId)!, item.unit), `${recipe.id}: ${item.ingredientId}`).toBe(true);
      }
    }
  });
});

describe('aviso de etiqueta en las recetas veganas', () => {
  it('señala el pan y la pasta, que según la marca pueden llevar huevo o leche', () => {
    expect(checks('tostadas-con-tomate-y-aceite')).toEqual(['pan']);
    expect(checks('espaguetis-con-verduras')).toEqual(['espaguetis']);
  });

  it('no dice nada si ningún ingrediente depende de la marca', () => {
    expect(checks('pisto')).toEqual([]);
  });

  it('no se aplica a las recetas que ya no son veganas', () => {
    // Lleva pan, pero también huevo: es vegetariana y el aviso no tendría sentido.
    expect(checks('huevos-revueltos-con-tostada')).toEqual([]);
  });
});

describe('cantidades en el texto de la receta', () => {
  const line = (recipeId: string, ingredientId: string, factor = 1) => {
    const item = catalog.recipeById.get(recipeId)!.ingredients.find((i) => i.ingredientId === ingredientId)!;
    return formatRecipeIngredient(catalog.ingredients.get(ingredientId)!, item, factor);
  };

  it('media cucharadita va en singular', () => {
    expect(line('garbanzos-con-espinacas', 'comino-molido')).toBe('½ cucharadita de comino molido');
  });

  it('más de una va en plural', () => {
    expect(line('garbanzos-con-espinacas', 'comino-molido', 3)).toBe('1 ½ cucharaditas de comino molido');
    expect(line('garbanzos-con-espinacas', 'aceite-oliva')).toBe('2 cucharadas de aceite de oliva');
  });
});
