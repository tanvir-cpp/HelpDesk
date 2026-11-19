import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example: 'I have attached the log file showing the exact error stack trace.',
    description: 'Message or reply content for the ticket conversation',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
