import * as bcrypt from 'bcrypt';
import AppDataSource from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { configuration } from '../../config/configuration';

async function seed() {
  const config = configuration();
  console.log('--- HelpDesk Database Seeder ---');
  console.log(`Target database: ${config.database.database} on ${config.database.host}:${config.database.port}`);

  await AppDataSource.initialize();
  console.log('Data Source initialized.');

  const userRepository = AppDataSource.getRepository(User);

  const adminEmail = config.adminSeed.email;
  const existingAdmin = await userRepository.findOne({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`Admin account with email [${adminEmail}] already exists. Skipping.`);
  } else {
    const saltRounds = config.bcrypt.saltRounds;
    const hashedPassword = await bcrypt.hash(config.adminSeed.password, saltRounds);

    const adminUser = userRepository.create({
      name: config.adminSeed.name,
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    });

    await userRepository.save(adminUser);
    console.log(`Successfully created Admin account:`);
    console.log(`  Name:  ${adminUser.name}`);
    console.log(`  Email: ${adminUser.email}`);
    console.log(`  Role:  ${adminUser.role}`);
  }

  await AppDataSource.destroy();
  console.log('Seeding finished successfully.');
}

seed().catch((error) => {
  console.error('Seeding failed with error:', error);
  process.exit(1);
});
