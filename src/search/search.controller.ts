import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { BookResponseDto } from '../books/dto/book-response.dto';
import { SearchDto } from './dto/search.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Search published book titles and tags',
    description:
      'Full-text matches ranked by relevance, with title matches weighted above tags. Excludes inactive authors. Supports limit/offset pagination.',
  })
  @ApiOkResponse({ type: [BookResponseDto] })
  @ApiBadRequestResponse({
    description:
      'Missing or invalid query, invalid pagination, or unexpected parameters.',
  })
  search(@Query() query: SearchDto) {
    return this.searchService.search(query);
  }
}
