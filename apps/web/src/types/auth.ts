export type Role = 'ADMIN' | 'USER';

export type PublicUser = {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

export type AuthStatus = 'CHECKING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';
