import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      const redirectTo =
        ((location.state as { from?: { pathname?: string } } | null)?.from?.pathname) ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <h1 className="login__title">oFraud | Consola administrativa</h1>
        <p className="login__subtitle">Autentícate con tus credenciales de administrador</p>
        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__label">
            Correo electrónico
            <input
              className="login__input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@ofraud.test"
              required
            />
          </label>
          <label className="login__label">
            Contraseña
            <input
              className="login__input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error && <p className="login__error">{error}</p>}
          <button className="button button--primary" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
