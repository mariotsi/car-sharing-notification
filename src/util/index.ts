export { default as parseEmailBody } from './parser';
export { emailsToFilter, fillTemplate } from './templates';
export { default as parseKey } from './parseKey';
export { default } from './authCodesStore';

export function getEnvValue(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Key ${key} not found among the enviroment variables`);
  }
  return value;
}
