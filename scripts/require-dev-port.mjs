import net from 'node:net';

const port = Number(process.env.PORT ?? 3000);

function portOpen(p) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: p, host: '127.0.0.1' });
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

const ok = await portOpen(port);
if (!ok) {
  console.error('');
  console.error(`  Na http://localhost:${port} nič nebeží.`);
  console.error('  Tunnel sám o sebe nestačí — potrebuješ aj dev server.');
  console.error('');
  console.error('  Možnosti:');
  console.error('    1) Dva terminály:  npm run dev   +   npm run dev:tunnel');
  console.error('    2) Jeden príkaz:   npm run dev:share');
  console.error('');
  process.exit(1);
}
