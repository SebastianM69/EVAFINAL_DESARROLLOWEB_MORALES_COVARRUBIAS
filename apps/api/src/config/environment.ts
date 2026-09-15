export type Environment = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  webOrigin: string;
  databaseUrl: string;
  testDatabaseUrl?: string;
  jwtAccessSecret: string;
  jwtAccessTtl: string;
  refreshTokenTtlDays: number;
  swaggerEnabled: boolean;
};

function requiredString(values: Record<string, unknown>, name: string): string {
  const value = values[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function parsePort(value: unknown): number {
  const port = Number(value ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function parseNodeEnv(value: unknown): Environment['nodeEnv'] {
  if (value === undefined || value === '') {
    return 'development';
  }
  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }
  throw new Error('NODE_ENV must be development, test or production.');
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

export function validateEnvironment(values: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = parseNodeEnv(values.NODE_ENV);
  const webOrigin = requiredString(values, 'WEB_ORIGIN');
  const databaseUrl = requiredString(values, 'DATABASE_URL');
  const jwtAccessSecret = requiredString(values, 'JWT_ACCESS_SECRET');
  const jwtAccessTtl = requiredString(values, 'JWT_ACCESS_TTL');
  const refreshTokenTtlDays = Number(values.REFRESH_TOKEN_TTL_DAYS ?? 7);

  if (jwtAccessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  }
  if (!Number.isInteger(refreshTokenTtlDays) || refreshTokenTtlDays < 1) {
    throw new Error('REFRESH_TOKEN_TTL_DAYS must be a positive integer.');
  }

  if (nodeEnv === 'production' && !parseBoolean(values.SWAGGER_ENABLED)) {
    values.SWAGGER_ENABLED = false;
  }

  return {
    ...values,
    NODE_ENV: nodeEnv,
    PORT: parsePort(values.PORT),
    WEB_ORIGIN: webOrigin,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_ACCESS_TTL: jwtAccessTtl,
    REFRESH_TOKEN_TTL_DAYS: refreshTokenTtlDays,
    SWAGGER_ENABLED: parseBoolean(values.SWAGGER_ENABLED),
  };
}

export function readEnvironment(values: Record<string, unknown>): Environment {
  const validated = validateEnvironment(values);
  const testDatabaseUrl =
    typeof validated.TEST_DATABASE_URL === 'string'
      ? validated.TEST_DATABASE_URL.trim()
      : undefined;

  return {
    nodeEnv: validated.NODE_ENV as Environment['nodeEnv'],
    port: validated.PORT as number,
    webOrigin: validated.WEB_ORIGIN as string,
    databaseUrl: validated.DATABASE_URL as string,
    ...(testDatabaseUrl ? { testDatabaseUrl } : {}),
    jwtAccessSecret: validated.JWT_ACCESS_SECRET as string,
    jwtAccessTtl: validated.JWT_ACCESS_TTL as string,
    refreshTokenTtlDays: validated.REFRESH_TOKEN_TTL_DAYS as number,
    swaggerEnabled: validated.SWAGGER_ENABLED as boolean,
  };
}
