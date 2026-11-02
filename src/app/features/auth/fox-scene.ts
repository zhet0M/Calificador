import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { FoxController } from './fox-renderer';

@Component({
  selector: 'app-fox-scene',
  standalone: true,
  template: `
    <img src="/login/fox.webp" alt="" class="fallback" [class.hidden]="ready()" />
    <canvas #canvas aria-hidden="true" [class.ready]="ready()"></canvas>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
      pointer-events: none;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      opacity: 0;
      transition: opacity 1s;
    }
    canvas.ready {
      opacity: 1;
    }
    .fallback {
      position: absolute;
      width: min(62vw, 640px);
      height: 75%;
      object-fit: contain;
      left: 47%;
      top: 12%;
    }
    .fallback.hidden {
      visibility: hidden;
    }
    @media (max-width: 720px) {
      .fallback {
        width: 90%;
        height: 58%;
        left: 5%;
        top: 12%;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      canvas {
        transition: none;
      }
    }
  `,
})
export class FoxScene {
  readonly paused = input(false);
  readonly ready = signal(false);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private controller?: FoxController;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let destroyed = false;
    effect(() => {
      const paused = this.paused();
      this.controller?.setPaused(paused);
    });
    destroyRef.onDestroy(() => {
      destroyed = true;
      this.controller?.dispose();
    });
    afterNextRender(() => {
      if (!('WebGLRenderingContext' in window)) return;
      void import('./fox-renderer')
        .then(({ createFox }) => {
          if (destroyed) return;
          this.controller = createFox(this.canvas().nativeElement, () => {
            if (!destroyed) this.ready.set(true);
          });
          this.controller.setPaused(this.paused());
        })
        .catch(() => {
          /* The static fox remains available without WebGL. */
        });
    });
  }
}
