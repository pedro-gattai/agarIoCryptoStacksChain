import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users
  const sampleUsers = [
    {
      walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
      username: 'CryptoGamer1'
    },
    {
      walletAddress: '2Q7X8mzWpWK5zVYNqWXqaKYyWqYqWzDxqZmWqYqWqYqWq',
      username: 'AgarPro'
    },
    {
      walletAddress: '3B8Y9nAZrWK6aWYOtXXtbKZzXtYtXzEztanXtYtXtYtXt',
      username: 'SolanaSlayer'
    }
  ];

  for (const userData of sampleUsers) {
    const user = await prisma.user.upsert({
      where: { walletAddress: userData.walletAddress },
      update: {},
      create: {
        walletAddress: userData.walletAddress,
        username: userData.username,
        gamesPlayed: Math.floor(Math.random() * 50),
        gamesWon: Math.floor(Math.random() * 15),
        totalEarnings: Math.random() * 5,
        totalLosses: Math.random() * 2,
        highestScore: Math.floor(Math.random() * 10000)
      }
    });
    console.log(`Created user: ${user.username} (${user.walletAddress})`);
  }

  // Create a sample game
  const sampleGame = await prisma.game.create({
    data: {
      entryFee: 0.001,
      maxPlayers: 10,
      prizePool: 0.008, // 8 players joined
      gameMode: 'BATTLE_ROYALE',
      status: 'FINISHED',
      startTime: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      endTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    }
  });

  console.log(`Created sample game: ${sampleGame.id}`);

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });