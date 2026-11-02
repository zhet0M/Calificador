import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ITEM_GENRES, ItemType } from '../../../core/models/item.model';
import { ItemDraft, ItemRecord } from '../../../core/models/item-detail.model';

const optionalText = () => new FormControl('', { nonNullable: true });
export const integer = (control: AbstractControl): ValidationErrors | null =>
  control.value === null || control.value === '' || Number.isInteger(control.value)
    ? null
    : { integer: true };
const oneDecimal = (control: AbstractControl): ValidationErrors | null =>
  control.value === null ||
  (Number.isFinite(control.value) &&
    Math.abs(control.value * 10 - Math.round(control.value * 10)) < 1e-8)
    ? null
    : { decimal: true };
const numberControl = (max?: number, integral = true) =>
  new FormControl<number | null>(null, [
    Validators.min(0),
    ...(max === undefined ? [] : [Validators.max(max)]),
    integral ? integer : oneDecimal,
  ]);
export const nonBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };
export const dateOrder = (control: AbstractControl): ValidationErrors | null => {
  const start = control.get('inicio')?.value as string;
  const end = control.get('fin')?.value as string;
  return start && end && start > end ? { dateOrder: true } : null;
};

export function createItemForm() {
  return new FormGroup(
    {
      tipo: new FormControl<ItemType>('serie', {
        nonNullable: true,
        validators: Validators.required,
      }),
      nombre: new FormControl('', { nonNullable: true, validators: nonBlank }),
      personajes: optionalText(),
      inicio: optionalText(),
      fin: optionalText(),
      plataforma: optionalText(),
      episodio_fav: optionalText(),
      personaje_fav: optionalText(),
      frase_fav: optionalText(),
      estrellas: numberControl(5),
      corazones: numberControl(5),
      gotas: numberControl(5),
      episodios: numberControl(2147483647),
      duracion: optionalText(),
      pais: optionalText(),
      lo_recomiendo: new FormControl<boolean | null>(null),
      romance: numberControl(10),
      drama: numberControl(10),
      comedia: numberControl(10),
      ciencia_ficcion: numberControl(10),
      suspense_thriller: numberControl(10),
      terror: numberControl(10),
      fantasia: numberControl(10),
      accion_crimen: numberControl(10),
      subgeneros: new FormControl<string[]>([], { nonNullable: true }),
      color: optionalText(),
      palabra: optionalText(),
      comida: optionalText(),
      ost_favorito: optionalText(),
      nota_final: numberControl(10, false),
      resena: optionalText(),
    },
    { validators: dateOrder },
  );
}

export type ItemForm = ReturnType<typeof createItemForm>;

export function patchItemForm(form: ItemForm, item: ItemRecord): void {
  const textKeys = [
    'nombre',
    'personajes',
    'inicio',
    'fin',
    'plataforma',
    'episodio_fav',
    'personaje_fav',
    'frase_fav',
    'duracion',
    'pais',
    'color',
    'palabra',
    'comida',
    'ost_favorito',
    'resena',
  ] as const;
  for (const key of textKeys) form.controls[key].setValue(item[key] ?? '');
  form.patchValue({
    tipo: item.tipo,
    estrellas: item.estrellas,
    corazones: item.corazones,
    gotas: item.gotas,
    episodios: item.episodios,
    lo_recomiendo: item.lo_recomiendo,
    nota_final: item.nota_final,
    subgeneros: item.subgeneros ?? [],
  });
  for (const genre of ITEM_GENRES) form.controls[genre.value].setValue(item[genre.value]);
  form.markAsPristine();
}

export function itemDraft(form: ItemForm): ItemDraft {
  const raw = form.getRawValue();
  const text = (value: string) => value.trim() || null;
  return {
    ...raw,
    nombre: raw.nombre.trim(),
    foto_path: null,
    personajes: text(raw.personajes),
    inicio: text(raw.inicio),
    fin: text(raw.fin),
    plataforma: text(raw.plataforma),
    episodio_fav: text(raw.episodio_fav),
    personaje_fav: text(raw.personaje_fav),
    frase_fav: text(raw.frase_fav),
    duracion: text(raw.duracion),
    pais: text(raw.pais),
    color: text(raw.color),
    palabra: text(raw.palabra),
    comida: text(raw.comida),
    ost_favorito: text(raw.ost_favorito),
    resena: text(raw.resena),
  };
}
