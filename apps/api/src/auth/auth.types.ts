import type { Role } from '../generated/prisma/client.js';

export const REFRESH_COOKIE_NAME = 'ventasfix_refresh';

export type AccessTokenPayload = {
  sub: number;
  email: string;
  role: Role;
};

export type PublicUser = {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  role: Role;
};

export type AuthResult = {
  accessToken: string;
  user: PublicUser;
  refreshToken: string;
};

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};
