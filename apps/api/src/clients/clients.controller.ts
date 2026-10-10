
import {
  Body,
  Controller,
  Get,
  Post,
  Version,
} from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Version('1')
  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Version('1')
  @Post()
  create(@Body() data: CreateClientDto) {
    return this.clientsService.create(data);
  }
}
