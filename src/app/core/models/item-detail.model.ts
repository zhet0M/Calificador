import { ItemGenre, ItemSummary } from './item.model';

export interface ItemRecord extends ItemSummary, Record<ItemGenre, number | null> {
  personajes: string | null;
  inicio: string | null;
  fin: string | null;
  plataforma: string | null;
  episodio_fav: string | null;
  personaje_fav: string | null;
  frase_fav: string | null;
  corazones: number | null;
  gotas: number | null;
  episodios: number | null;
  duracion: string | null;
  pais: string | null;
  lo_recomiendo: boolean | null;
  subgeneros: string[] | null;
  color: string | null;
  palabra: string | null;
  comida: string | null;
  ost_favorito: string | null;
  resena: string | null;
}

export type ItemDraft = Omit<ItemRecord, 'id' | 'created_at'>;

export const ITEM_DETAIL_FIELDS =
  'id,created_at,tipo,nombre,foto_path,personajes,inicio,fin,plataforma,episodio_fav,personaje_fav,frase_fav,estrellas,corazones,gotas,episodios,duracion,pais,lo_recomiendo,romance,drama,comedia,ciencia_ficcion,suspense_thriller,terror,fantasia,accion_crimen,subgeneros,color,palabra,comida,ost_favorito,nota_final,resena';

export interface ItemSaveCommand {
  id: string;
  isNew: boolean;
  draft: ItemDraft;
  photo: Blob | null | undefined;
  userId: string;
}

export class ItemSaveError extends Error {
  constructor(readonly cleanupPath: string | null = null) {
    super('No pudimos confirmar el guardado. Conservamos tus cambios para que puedas reintentar.');
  }
}
