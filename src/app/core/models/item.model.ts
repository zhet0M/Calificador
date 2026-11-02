export type ItemType = 'serie' | 'pelicula' | 'libro' | 'anime';

export const ITEM_GENRES = [
  { value: 'romance', label: 'Romance' },
  { value: 'drama', label: 'Drama' },
  { value: 'comedia', label: 'Comedia' },
  { value: 'ciencia_ficcion', label: 'Ciencia ficción' },
  { value: 'suspense_thriller', label: 'Suspense / Thriller' },
  { value: 'terror', label: 'Terror' },
  { value: 'fantasia', label: 'Fantasía' },
  { value: 'accion_crimen', label: 'Acción / Crimen' },
] as const;

export type ItemGenre = (typeof ITEM_GENRES)[number]['value'];

export const ITEM_TYPES: ReadonlyArray<{ value: ItemType; label: string; singular: string }> = [
  { value: 'serie', label: 'Series', singular: 'Serie' },
  { value: 'pelicula', label: 'Películas', singular: 'Película' },
  { value: 'libro', label: 'Libros', singular: 'Libro' },
  { value: 'anime', label: 'Anime', singular: 'Anime' },
];

export interface ItemSummary {
  id: string;
  created_at: string;
  tipo: ItemType;
  nombre: string;
  foto_path: string | null;
  estrellas: number | null;
  nota_final: number | null;
}

export interface ItemListQuery {
  type: ItemType | 'all';
  genre: ItemGenre | 'all';
  search: string;
  page: number;
}

export const ITEMS_PAGE_SIZE = 24;
export const PHOTO_URL_SECONDS = 300;
