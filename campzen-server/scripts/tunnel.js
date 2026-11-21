/**
 * Kami Cloudflare Tunnel Automator
 *
 * Runs an account-free, high-speed Cloudflare Tunnel directly to port 5000,
 * and automatically synchronizes the public HTTPS URL into:
 *  - mobile/src/app/config/env.ts
 *  - vendor-app/src/config/env.ts
 *
 * This allows physical devices to connect seamlessly over:
 *  - Any Wi-Fi network (even with AP/Client isolation)
 *  - Mobile Cellular Data (4G / 5G)
 *  - Mobile Hotspots
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = process.env.PORT || 5000;
const MOBILE_ENV_PATH = path.resolve(__dirname, '../../mobile/src/app/config/env.ts');
const VENDOR_ENV_PATH = path.resolve(__dirname, '../../vendor-app/src/config/env.ts');

function updateEnvFile(filePath, tunnelUrl) {
  try {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /export const TUNNEL_URL: string = '.*?';/;
    const replacement = `export const TUNNEL_URL: string = '${tunnelUrl}';`;
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      fs.writeFileSync(filePath, content, 'utf8');
    }
  } catch (err) {
    console.error(`[Tunnel] Failed updating ${filePath}:`, err.message);
  }
}

function resetEnvFiles() {
  console.log('\n[Tunnel] Resetting TUNNEL_URL in client apps...');
  updateEnvFile(MOBILE_ENV_PATH, '');
  updateEnvFile(VENDOR_ENV_PATH, '');
  console.log('[Tunnel] Done. Reset back to local LAN mode.');
}

// Check if server is running on port 5000
function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/api/vendors`, { timeout: 2000 }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('============================================================');
  console.log('🌐 Starting Kami Cloudflare Tunnel for Port ' + PORT + '...');
  console.log('============================================================');

  const isServerUp = await checkServerRunning();
  if (!isServerUp) {
    console.log('⚠️  NOTE: Server does not appear to be responding on port ' + PORT + ' yet.');
    console.log('👉 Make sure you run "npm start" in the server directory in another terminal!\n');
  } else {
    console.log('✅ Local server verified active on port ' + PORT + '.\n');
  }

  console.log('⏳ Connecting to Cloudflare global network (zero account required)...');

  // Determine best cloudflared binary
  const installedCfPath = 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe';
  const cfCmd = fs.existsSync(installedCfPath) ? `"${installedCfPath}"` : 'cloudflared';

  // Spawn cloudflared tunnel
  const cloudflared = spawn(
    cfCmd,
    ['tunnel', '--url', `http://localhost:${PORT}`],
    { shell: true }
  );

  let tunnelFound = false;

  const handleOutput = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !tunnelFound) {
      tunnelFound = true;
      const tunnelUrl = match[0];

      // Automatically sync into mobile and vendor apps
      updateEnvFile(MOBILE_ENV_PATH, tunnelUrl);
      updateEnvFile(VENDOR_ENV_PATH, tunnelUrl);

      console.log('\n============================================================');
      console.log('🚀 KAMI CLOUDFLARE TUNNEL ONLINE!');
      console.log(`🌐 Public Tunnel URL: ${tunnelUrl}`);
      console.log(`📡 API Base Endpoint: ${tunnelUrl}/api`);
      console.log('============================================================');
      console.log('✅ Synchronized TUNNEL_URL automatically into:');
      console.log(`   - mobile/src/app/config/env.ts`);
      console.log(`   - vendor-app/src/config/env.ts`);
      console.log('\n📱 Both mobile & vendor apps will now connect from ANYWHERE:');
      console.log('   - Cellular Data (4G / 5G)');
      console.log('   - College or Public Wi-Fi');
      console.log('   - Mobile Hotspot\n');
      console.log('💡 TIP: To also run Expo bundler over tunnel across networks, run:');
      console.log('   npm run tunnel  (in mobile or vendor-app)');
      console.log('============================================================');
      console.log('Press Ctrl+C to stop tunnel.\n');
    }
  };

  cloudflared.stdout.on('data', handleOutput);
  cloudflared.stderr.on('data', handleOutput);

  cloudflared.on('error', (err) => {
    console.error('[Tunnel Error]', err);
  });

  const cleanup = () => {
    resetEnvFiles();
    try {
      cloudflared.kill();
    } catch {}
    process.exit(0);
  };

  if (process.platform === 'win32') {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on('SIGINT', () => {
      cleanup();
    });
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', () => {
    resetEnvFiles();
  });
}

main();
