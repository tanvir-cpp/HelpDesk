import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveTicketDto {
  @ApiProperty({
    example: 'Identified SSL certificate renewal issue on payment upstream proxy. Fixed upstream certificate.',
    description: 'Detailed resolution notes provided by staff or admin',
  })
  @IsString()
  @IsNotEmpty()
  resolutionNote!: string;
}
