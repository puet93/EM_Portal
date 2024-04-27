import type { Password, User } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { prisma } from '~/db.server';

export type { User } from '@prisma/client';

export async function getUserById(id: User['id']) {
	return prisma.user.findUnique({ where: { id }, include: { vendor: true } });
}

export async function getUserByEmail(email: User['email']) {
	return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: User['email'], password: string) {
	const hashedPassword = await bcrypt.hash(password, 10);

	return prisma.user.create({
		data: {
			email,
			password: {
				create: {
					hash: hashedPassword,
				},
			},
		},
	});
}

export async function createSuperAdmin(email: User['email'], password: string) {
	const hashedPassword = await bcrypt.hash(password, 10);

	return prisma.user.create({
		data: {
			email,
			password: {
				create: {
					hash: hashedPassword,
				},
			},
			role: 'SUPERADMIN',
		},
	});
}

export async function deleteUserByEmail(email: User['email']) {
	return prisma.user.delete({ where: { email } });
}

export async function seedUsers() {
	return await prisma.$transaction([
		prisma.user.create({
			data: {
				email: 'eddie.bedrosian@edwardmartin.com',
				password: {
					create: { hash: await bcrypt.hash('Emeraldbay823', 10) },
				},
				firstName: 'Eddie',
				lastName: 'Bedrosian',
				role: 'SUPERADMIN',
			},
		}),
		prisma.user.create({
			data: {
				email: 'greg.tracz@edwardmartin.com',
				password: {
					create: { hash: await bcrypt.hash('gregtracz', 10) },
				},
				firstName: 'Greg',
				lastName: 'Tracz',
				role: 'SUPERADMIN',
			},
		}),
		prisma.user.create({
			data: {
				email: 'hhernandez@florimusa.com',
				password: {
					create: {
						hash: await bcrypt.hash('hamiltonhernandez', 10),
					},
				},
				firstName: 'Hamilton',
				lastName: 'Hernandez',
				role: 'USER',
			},
		}),
		prisma.user.create({
			data: {
				email: 'nicole.portman@edwardmartin.com',
				password: {
					create: { hash: await bcrypt.hash('nicoleportman', 10) },
				},
				firstName: 'Nicole',
				lastName: 'Portman',
				role: 'SUPERADMIN',
			},
		}),
	]);
}

export async function verifyLogin(
	email: User['email'],
	password: Password['hash']
) {
	const userWithPassword = await prisma.user.findUnique({
		where: { email },
		include: {
			password: true,
		},
	});

	if (!userWithPassword || !userWithPassword.password) {
		return null;
	}

	const isValid = await bcrypt.compare(
		password,
		userWithPassword.password.hash
	);

	if (!isValid) {
		return null;
	}

	const { password: _password, ...userWithoutPassword } = userWithPassword;

	return userWithoutPassword;
}
