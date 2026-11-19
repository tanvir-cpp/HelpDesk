import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { TicketPriority } from '../../../common/enums/ticket-priority.enum';
import { TicketStatus } from '../../../common/enums/ticket-status.enum';
import { User } from '../../users/entities/user.entity';
import { TicketComment } from '../../ticket-comments/entities/ticket-comment.entity';
import { TicketActivity } from '../../ticket-activities/entities/ticket-activity.entity';

@Entity({ name: 'tickets' })
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'reference_number', type: 'varchar', length: 50, unique: true })
  referenceNumber!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority!: TicketPriority;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status!: TicketStatus;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, (user) => user.createdTickets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @Column({ name: 'resolved_by_id', type: 'uuid', nullable: true })
  resolvedById?: string | null;

  @ManyToOne(() => User, (user) => user.resolvedTickets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy?: User | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote?: string | null;

  @Column({
    name: 'resolved_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  resolvedAt?: Date | null;

  @Column({
    name: 'closed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  closedAt?: Date | null;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @OneToMany(() => TicketComment, (comment) => comment.ticket)
  comments?: TicketComment[];

  @OneToMany(() => TicketActivity, (activity) => activity.ticket)
  activities?: TicketActivity[];
}
