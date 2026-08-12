import { execSync } from 'node:child_process';
import { platform } from 'node:os';

const port = Number(process.env.PORT ?? 3000);

function killPortWindows(p) {
  try {
    const output = execSync(`netstat -ano | findstr :${p}`, { encoding: 'utf8' });
    const pids = new Set(
      output
        .split('\n')
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => !!pid && /^\d+$/.test(pid) && pid !== '0'),
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[dev] Freed port ${p} (stopped PID ${pid})`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // No listener on this port.
  }
}

function killPortUnix(p) {
  try {
    const pid = execSync(`lsof -ti tcp:${p}`, { encoding: 'utf8' }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
      console.log(`[dev] Freed port ${p} (stopped PID ${pid})`);
    }
  } catch {
    // No listener on this port.
  }
}

if (platform() === 'win32') killPortWindows(port);
else killPortUnix(port);
