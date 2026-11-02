import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { Login } from './login';

describe('Login', () => {
  const signIn = vi.fn();
  beforeEach(() => {
    signIn.mockReset();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { signIn, configurationError: signal(false) } },
      ],
    });
  });

  it('does not send an invalid form', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.componentInstance.submit();
    expect(signIn).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.touched).toBe(true);
  });

  it('shows a generic failure and clears the password', async () => {
    signIn.mockResolvedValue(false);
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.form.setValue({ email: 'journal@example.test', password: 'wrong' });
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Correo o contraseña incorrectos',
    );
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
  });

  it('prevents duplicate requests and navigates after successful login', async () => {
    let resolve!: (value: boolean) => void;
    signIn.mockReturnValue(
      new Promise<boolean>((done) => {
        resolve = done;
      }),
    );
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.form.setValue({
      email: 'journal@example.test',
      password: 'password',
    });
    const first = fixture.componentInstance.submit();
    await fixture.componentInstance.submit();
    expect(signIn).toHaveBeenCalledTimes(1);
    resolve(true);
    await first;
    expect(navigate).toHaveBeenCalledWith('/items', { replaceUrl: true });
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
  });
});
