import { PartialType } from '@nestjs/swagger';
import { CreateChapterPageDto } from './create-chapter-page.dto';

export class UpdateChapterPageDto extends PartialType(CreateChapterPageDto) {}
