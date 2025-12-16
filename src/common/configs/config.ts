import type { Config } from './config.interface';

const config: Config = {
  nest: {
    port: 3000,
  },
  cors: {
    enabled: true,
  },
  swagger: {
    enabled: true,
    title: 'Infigon APIs',
    description: 'Infigon Backend API description',
    version: '1.0',
    path: 'docs',
  },
};

export default (): Config => config;
