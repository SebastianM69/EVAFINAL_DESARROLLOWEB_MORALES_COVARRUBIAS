import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { useAuth } from '../auth/auth-context';
import { ApiError } from '../services/api-client';
import { StatusBanner } from '../components/StatusBanner';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

type LoginForm = z.infer<typeof loginSchema>;

type LocationState = {
  from?: string;
};

export function LoginPage(): React.JSX.Element {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (status === 'CHECKING') {
    return <div className="route-state">Comprobando sesión…</div>;
  }

  async function handleSubmit(values: LoginForm): Promise<void> {
    try {
      await login(values.email, values.password);
      await navigate(state?.from ?? '/dashboard', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        form.setError('root', { message: error.message });
        return;
      }
      form.setError('root', { message: 'No fue posible iniciar sesión.' });
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-mark">VF</span>
          <span>VENTASFIX</span>
        </div>
        <p className="eyebrow">ACCESO DE PERSONAL</p>
        <h1 id="login-title">Una vista clara para cada decisión.</h1>
        <p className="login-intro">Ingresa al backoffice para revisar la operación comercial.</p>
        {form.formState.errors.root?.message && (
          <StatusBanner message={form.formState.errors.root.message} tone="error" />
        )}
        <form
          className="login-form"
          onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
          noValidate
        >
          <label htmlFor="email">Correo corporativo</label>
          <input id="email" type="email" autoComplete="username" {...form.register('email')} />
          {form.formState.errors.email?.message && (
            <span className="field-error">{form.formState.errors.email.message}</span>
          )}
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
          {form.formState.errors.password?.message && (
            <span className="field-error">{form.formState.errors.password.message}</span>
          )}
          <button className="primary-button" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Validando…' : 'Entrar al backoffice'}
          </button>
        </form>
      </section>
      <aside className="login-aside" aria-label="Mensaje de marca">
        <div className="aside-orbit" aria-hidden="true" />
        <p className="eyebrow">VENTASFIX / OPERACIONES</p>
        <p className="aside-quote">Datos precisos. Acciones simples.</p>
        <p className="aside-caption">
          Un espacio de trabajo diseñado para el ritmo real de una empresa B2B.
        </p>
      </aside>
    </main>
  );
}
