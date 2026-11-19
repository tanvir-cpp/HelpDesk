import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'Updated comment content with additional reproduction details.',
    description: 'Updated text content of the comment',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
