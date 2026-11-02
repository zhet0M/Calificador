import { createItemForm, itemDraft, patchItemForm } from './item-form.model';
import { ItemRecord } from '../../../core/models/item-detail.model';

describe('Item form validation and serialization', () => {
  it('only requires a real name and preserves blank genre scores as NULL', () => {
    const form = createItemForm();
    form.controls.nombre.setValue('   ');
    expect(form.valid).toBe(false);
    form.controls.nombre.setValue('  Mi historia  ');
    expect(form.valid).toBe(true);
    expect(itemDraft(form).nombre).toBe('Mi historia');
    expect(itemDraft(form).romance).toBeNull();
    form.controls.romance.setValue(0);
    expect(itemDraft(form).romance).toBe(0);
  });
  it('validates integers, rating bounds, chronological dates and one decimal', () => {
    const form = createItemForm();
    form.controls.nombre.setValue('Historia');
    form.controls.episodios.setValue(2.5);
    expect(form.valid).toBe(false);
    form.controls.episodios.setValue(2);
    form.controls.estrellas.setValue(6);
    expect(form.valid).toBe(false);
    form.controls.estrellas.setValue(0);
    form.controls.inicio.setValue('2026-03-02');
    form.controls.fin.setValue('2026-03-01');
    expect(form.hasError('dateOrder')).toBe(true);
    form.controls.fin.setValue('2026-03-02');
    form.controls.nota_final.setValue(8.55);
    expect(form.valid).toBe(false);
    form.controls.nota_final.setValue(8.5);
    expect(form.valid).toBe(true);
    form.controls.terror.setValue(-1);
    expect(form.valid).toBe(false);
  });
  it('round-trips zero, false, unknown subgenres and existing text without adding ownership fields', () => {
    const form = createItemForm();
    form.controls.nombre.setValue('Historia');
    const original: ItemRecord = {
      ...itemDraft(form),
      id: 'a',
      created_at: '2026-01-01',
      romance: 0,
      lo_recomiendo: false,
      subgeneros: ['Propio'],
      resena: '<b>texto</b>',
    };
    patchItemForm(form, original);
    const draft = itemDraft(form);
    expect(draft.romance).toBe(0);
    expect(draft.lo_recomiendo).toBe(false);
    expect(draft.subgeneros).toEqual(['Propio']);
    expect(draft.resena).toBe('<b>texto</b>');
    expect(draft).not.toHaveProperty('id');
    expect(draft).not.toHaveProperty('user_id');
    expect(form.pristine).toBe(true);
  });
});
