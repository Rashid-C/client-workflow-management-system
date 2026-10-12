import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';

describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: POSTGRES_POOL,
          useValue: {
            query: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});