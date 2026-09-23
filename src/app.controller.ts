import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @ApiOperation({ summary: 'Check the API is running' })
  @ApiOkResponse({
    description: 'API greeting.',
    schema: { type: 'string', example: 'Hello World!' },
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
