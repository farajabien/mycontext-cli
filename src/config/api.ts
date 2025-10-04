export interface ApiConfig {
  baseUrl: string;
  authUrl: string;
  apiUrl: string;
}

export function getApiConfig(): ApiConfig {
  // Check for environment variable first
  const baseUrl =
    process.env.MYCONTEXT_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://mycontext.fbien.com";

  return {
    baseUrl,
    authUrl: `${baseUrl}/auth`,
    apiUrl: `${baseUrl}/api/v1`,
  };
}

export function getApiUrl(endpoint: string): string {
  const config = getApiConfig();
  return `${config.apiUrl}${endpoint}`;
}

export function getAuthUrl(path: string): string {
  const config = getApiConfig();
  return `${config.authUrl}${path}`;
}
