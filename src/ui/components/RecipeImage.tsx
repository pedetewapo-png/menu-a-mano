import { useLiveQuery } from 'dexie-react-hooks';
import { getUserPhoto } from '../../data/repos';
import { isUserRecipe, type Recipe, type UserRecipe } from '../../domain/types';

interface RecipeImageProps {
  recipe: Recipe;
  size: 'thumb' | 'detail';
}

const WIDTH = { thumb: 320, detail: 960 };

function Placeholder({ recipe }: { recipe: Recipe }) {
  return (
    <div className={`recipe-image recipe-image-empty group-${recipe.mainGroup}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" width="40%" height="40%" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="24" cy="24" r="17" />
        <circle cx="24" cy="24" r="10" />
      </svg>
    </div>
  );
}

/** Foto de una receta propia: la miniatura va con la receta; la grande se carga solo en el detalle. */
function UserRecipeImage({ recipe, size }: { recipe: UserRecipe; size: 'thumb' | 'detail' }) {
  const full = useLiveQuery(
    () => (size === 'detail' && recipe.photoThumb ? getUserPhoto(recipe.id) : undefined),
    [recipe.id, recipe.photoThumb, size],
  );
  if (!recipe.photoThumb) return <Placeholder recipe={recipe} />;
  return (
    <img
      className="recipe-image"
      src={full ?? recipe.photoThumb}
      alt={size === 'detail' ? recipe.name : ''}
      width={WIDTH[size]}
      height={(WIDTH[size] * 3) / 4}
    />
  );
}

/**
 * Imagen de una receta con proporción 4:3 reservada, para que la página no salte.
 * Si la receta aún no tiene foto se muestra un marcador neutro del mismo tamaño.
 */
export function RecipeImage({ recipe, size }: RecipeImageProps) {
  if (isUserRecipe(recipe)) return <UserRecipeImage recipe={recipe} size={size} />;
  if (!recipe.image) return <Placeholder recipe={recipe} />;
  const width = WIDTH[size];
  return (
    <img
      className="recipe-image"
      src={`${import.meta.env.BASE_URL}recipes/${recipe.id}-${width}.webp`}
      // En listas el nombre va al lado, así que la miniatura es decorativa.
      alt={size === 'detail' ? recipe.image.alt : ''}
      width={width}
      height={(width * 3) / 4}
      loading="lazy"
      decoding="async"
    />
  );
}
