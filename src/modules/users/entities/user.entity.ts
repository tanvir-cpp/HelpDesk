import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { TicketComment } from '../../ticket-comments/entities/ticket-comment.entity';
import { TicketActivity } from '../../ticket-activities/entities/ticket-activity.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.CLIENT,
  })
  role!: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.createdBy)
  createdTickets?: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.resolvedBy)
  resolvedTickets?: Ticket[];

  @OneToMany(() => TicketComment, (comment) => comment.author)
  comments?: TicketComment[];

  @OneToMany(() => TicketActivity, (activity) => activity.actor)
  activities?: TicketActivity[];
}
