import type { PublicUser } from './auth';

export type UserInput = {
  rut: string;
  nombre: string;
  apellido: string;
  email: string;
  password?: string;
};

export type UserRecord = PublicUser;
