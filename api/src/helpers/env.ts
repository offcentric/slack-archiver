import { getEnvConfig } from './config';

export const isProductionEnvironment = getEnvConfig('ENVIRONMENT', 'production') === 'production';
export const isDevEnvironment = getEnvConfig('ENVIRONMENT', 'production') !== 'production';
export const isLocalEnvironment = getEnvConfig('ENVIRONMENT', "production").indexOf('dev') !== -1;
export const environmentLabel = getEnvConfig('ENVIRONMENT', 'production');

export const isCrmEnabled = getEnvConfig('ENABLE_CRM', false) === true;

export const isCacheEnabled = isProductionEnvironment;