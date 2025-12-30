// Keep backend alive by pinging every 3 minutes
// Render free tier spins down after 15 mins of inactivity

const BACKEND_URL = 'https://peoplecoin-api.onrender.com';
const PING_INTERVAL = 3 * 60 * 1000; // 3 minutes

async function pingBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Backend alive:`, data);
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ✗ Backend ping failed:`, error.message);
  }
}

// Ping immediately on start
console.log('🚀 Starting backend keep-alive service...');
console.log(`📍 Backend URL: ${BACKEND_URL}`);
console.log(`⏱️  Ping interval: ${PING_INTERVAL / 1000 / 60} minutes\n`);

pingBackend();

// Then ping every 3 minutes
setInterval(pingBackend, PING_INTERVAL);
