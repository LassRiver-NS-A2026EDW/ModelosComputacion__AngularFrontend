import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor funcional que inyecta el token de autenticación
 * en cada petición HTTP saliente hacia la API.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Use localStorage directly to avoid circular dependency with AuthStore
  let token = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    token = localStorage.getItem('auth_token');
  }
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Token ${token}`,
      },
    });
  }

  return next(req);
};
