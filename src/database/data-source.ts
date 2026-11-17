import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { Ticket } from '../modules/tickets/entities/ticket.entity';
import { TicketComment } from '../modules/ticket-comments/entities/ticket-comment.entity';
import { TicketActivity } from '../modules/ticket-activities/entities/ticket-activity.entity';

// Determine environment file
const envFile = process.env.NODE_ENV === 'test'
  ? '.env.test'
  : process.env.NODE_ENV === 'production'
    ? '.env'
    : '.env.development';

dotenv.config({ path: envFile });
dotenv.config(); // fallback to .env if specific file doesn't override

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'helpdesk_db',
  entities: [User, Ticket, TicketComment, TicketActivity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
