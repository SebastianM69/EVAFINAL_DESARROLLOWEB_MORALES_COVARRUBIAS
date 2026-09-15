import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'ventasfix-api' })
  service!: string;

  @ApiProperty({ example: '2026-09-15T12:00:00.000Z' })
  timestamp!: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): { status: 'ok'; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'ventasfix-api',
      timestamp: new Date().toISOString(),
    };
  }
}
