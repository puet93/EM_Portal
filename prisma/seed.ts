import type { Role } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
	const email = 'eddie.bedrosian@edwardmartin.com';

	// cleanup the existing database
	await prisma.user.delete({ where: { email } }).catch(() => {
		// no worries if it doesn't exist yet
	});

	const SUPERADMIN: Role = 'SUPERADMIN';

	await prisma.$transaction([
		prisma.user.create({
			data: {
				email: 'eddie.bedrosian@edwardmartin.com',
				password: {
					create: { hash: await bcrypt.hash('Emeraldbay823', 10) },
				},
				role: SUPERADMIN,
			},
		}),
		prisma.user.create({
			data: {
				email: 'eddy.tseng@edwardmartin.com',
				password: {
					create: { hash: await bcrypt.hash('eddyrules', 10) },
				},
				role: SUPERADMIN,
			},
		}),
		prisma.user.create({
			data: {
				email: 'greg.tracz@edwardmartin.com',
				password: {
					create: { hash: await bcrypt.hash('gregtracz', 10) },
				},
				role: SUPERADMIN,
			},
		}),
		prisma.user.create({
			data: {
				email: 'nicole.portman@edwardmartin.com',
				password: {
					create: { hash: await bcrypt.hash('nicoleportman', 10) },
				},
				role: SUPERADMIN,
			},
		}),
	]);

	console.log(`Database has been seeded. 🌱`);
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
