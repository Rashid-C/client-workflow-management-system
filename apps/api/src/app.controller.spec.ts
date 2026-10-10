
import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  const appController = new AppController();

  it('should return the health status', () => {
    expect(appController.checkHealth()).toEqual({
      status: 'ok',
      service: 'tickwise-api',
    });
  });
});
