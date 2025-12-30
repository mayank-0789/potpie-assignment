import { prisma } from './src/client';

async function main() {
  console.log('Testing database connection...');
  
  // Test query
  const count = await prisma.analysisJob.count();
  console.log(`✅ Connected! Found ${count} analysis jobs.`);
}

main()
  .catch((e) => {
    console.error('❌ Connection failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
