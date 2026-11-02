import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CharacterEditor } from './character-editor';
import { DurationEditor } from './duration-editor';
import {
  formatDuration,
  parseCharacters,
  parseDuration,
  serializeCharacters,
} from './structured-fields.model';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CharacterEditor, DurationEditor],
  template: `<form [formGroup]="form">
    <app-character-editor formControlName="personajes" /><app-duration-editor
      formControlName="duracion"
    />
  </form>`,
})
class Host {
  readonly form = new FormGroup({
    personajes: new FormControl('', { nonNullable: true }),
    duracion: new FormControl('', { nonNullable: true }),
  });
}

describe('Structured journal fields', () => {
  function setup(personajes = '', duration = '') {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.form.setValue({ personajes, duracion: duration });
    fixture.detectChanges();
    return {
      fixture,
      host: fixture.componentInstance,
      characters: fixture.debugElement.query(By.directive(CharacterEditor))
        .componentInstance as CharacterEditor,
      duration: fixture.debugElement.query(By.directive(DurationEditor))
        .componentInstance as DurationEditor,
    };
  }

  it('stores one name per line while preserving commas inside a name', () => {
    expect(parseCharacters('Ana, María\r\nLee\n\n')).toEqual(['Ana, María', 'Lee']);
    expect(serializeCharacters([' Ana, María ', ' ', 'Lee'])).toBe('Ana, María\nLee');
  });
  it('loads legacy character text without marking the record dirty', () => {
    const { host, characters } = setup('Ana, María y Lee');
    expect(characters.characters.getRawValue()).toEqual(['Ana, María y Lee']);
    expect(host.form.controls.personajes.value).toBe('Ana, María y Lee');
    expect(host.form.pristine).toBe(true);
  });
  it('adds, edits, and removes individual characters through the parent form control', () => {
    const { host, characters } = setup('Ana');
    characters.add();
    characters.characters.at(1).setValue('Lee');
    expect(host.form.controls.personajes.value).toBe('Ana\nLee');
    characters.characters.at(0).setValue('Ana María');
    expect(host.form.controls.personajes.value).toBe('Ana María\nLee');
    characters.remove(0);
    expect(host.form.controls.personajes.value).toBe('Lee');
    characters.remove(0);
    expect(host.form.controls.personajes.value).toBe('');
    expect(host.form.dirty).toBe(true);
  });
  it('supports line-free optional names and parent disabled state', () => {
    const { host, characters, duration } = setup();
    characters.add();
    expect(host.form.controls.personajes.value).toBe('');
    host.form.disable();
    const count = characters.characters.length;
    characters.add();
    duration.stepHours(1);
    expect(characters.characters.length).toBe(count);
    expect(duration.parts.controls.hours.value).toBeNull();
    expect(characters.characters.disabled).toBe(true);
  });
  it.each([
    ['00:45', 0, 45],
    ['27:30', 27, 30],
    ['01:15:00', 1, 15],
    ['45 min', 0, 45],
    ['90 minutos', 1, 30],
    ['2 h 15 min', 2, 15],
    ['2h', 2, 0],
  ])('interprets %s without treating elapsed time as a time of day', (text, hours, minutes) => {
    expect(parseDuration(String(text))).toEqual({ hours, minutes });
  });
  it('keeps known legacy formatting until the user changes a duration part', () => {
    const { host, duration } = setup('', '45 min');
    expect(host.form.controls.duracion.value).toBe('45 min');
    expect(host.form.pristine).toBe(true);
    duration.stepHours(1);
    expect(host.form.controls.duracion.value).toBe('01:45');
    expect(host.form.dirty).toBe(true);
  });
  it('preserves unknown legacy text and seconds instead of guessing', () => {
    const { host, duration } = setup('', 'Una tarde entera');
    expect(duration.legacy()).toBe('Una tarde entera');
    expect(host.form.controls.duracion.value).toBe('Una tarde entera');
    expect(host.form.valid).toBe(true);
    expect(parseDuration('01:02:30')).toBeNull();
    expect(parseDuration('99:99')).toBeNull();
    duration.replaceLegacy();
    expect(host.form.controls.duracion.value).toBe('00:00');
  });
  it('validates hours and minutes on the parent form and allows clearing', () => {
    const { host, duration } = setup();
    duration.parts.setValue({ hours: 27, minutes: 30 });
    expect(host.form.controls.duracion.value).toBe('27:30');
    expect(host.form.valid).toBe(true);
    duration.parts.controls.hours.setValue(-1);
    expect(host.form.controls.duracion.hasError('duration')).toBe(true);
    duration.parts.controls.hours.setValue(1.5);
    expect(host.form.invalid).toBe(true);
    duration.parts.setValue({ hours: 1, minutes: 60 });
    expect(host.form.invalid).toBe(true);
    duration.clear();
    expect(host.form.controls.duracion.value).toBe('');
    expect(host.form.valid).toBe(true);
    expect(formatDuration({ hours: null, minutes: null })).toBe('');
    expect(formatDuration({ hours: null, minutes: 5 })).toBe('00:05');
  });
});
