import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FoxScene } from './fox-scene';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FoxScene],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('loginDialog');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('backgroundVideo');
  private syncVideo?: () => void;
  readonly loginOpen = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      this.loginOpen();
      this.syncVideo?.();
    });
    afterNextRender(() => {
      const video = this.video()?.nativeElement;
      if (!video || !('WebGLRenderingContext' in window)) return;
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.syncVideo = () => {
        if (motion.matches || this.loginOpen() || document.hidden) {
          video.pause();
          return;
        }
        video.muted = true;
        if (!video.getAttribute('src')) video.src = '/login/autumn.mp4';
        void video.play().catch(() => {
          /* The poster covers autoplay restrictions. */
        });
      };
      const sync = this.syncVideo;
      motion.addEventListener('change', sync);
      document.addEventListener('visibilitychange', sync);
      sync();
      destroyRef.onDestroy(() => {
        motion.removeEventListener('change', sync);
        document.removeEventListener('visibilitychange', sync);
        video.pause();
        video.removeAttribute('src');
        video.load();
      });
    });
  }

  openLogin(): void {
    this.dialog()?.nativeElement.showModal();
    this.loginOpen.set(true);
  }

  closeLogin(event?: Event): void {
    event?.preventDefault();
    if (this.busy()) return;
    this.dialog()?.nativeElement.close();
    this.loginOpen.set(false);
    this.form.controls.password.reset();
    this.error.set('');
  }

  onBackdropClick(event: MouseEvent): void {
    const dialog = this.dialog()?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      this.closeLogin();
    }
  }

  keepFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const elements = this.dialog()?.nativeElement.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), a[href]',
    );
    if (!elements?.length) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      if (await this.auth.signIn(email, password)) {
        this.form.controls.password.reset();
        await this.router.navigateByUrl('/items', { replaceUrl: true });
      } else {
        this.error.set('Correo o contraseña incorrectos. Inténtalo de nuevo.');
        this.form.controls.password.reset();
      }
    } finally {
      this.busy.set(false);
    }
  }
}
