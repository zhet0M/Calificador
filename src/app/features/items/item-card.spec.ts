import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ItemCard } from './item-card';

describe('ItemCard', () => {
  it('escapes user text and supports zero and missing ratings', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ItemCard);
    fixture.componentRef.setInput('item', {
      id: 'a',
      nombre: '<img src=x onerror=alert(1)>',
      tipo: 'libro',
      estrellas: 0,
      nota_final: 0,
      foto_path: null,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h3')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(element.querySelector('h3 img')).toBeNull();
    expect(element.querySelector('.score')?.textContent).toContain('0,0');
    expect(element.querySelectorAll('.filled').length).toBe(0);
    fixture.componentRef.setInput('item', {
      id: 'b',
      nombre: 'Sin nota',
      tipo: 'serie',
      estrellas: null,
      nota_final: null,
      foto_path: null,
    });
    fixture.detectChanges();
    expect(element.querySelector('.score')?.textContent).toContain('—');
  });
});
