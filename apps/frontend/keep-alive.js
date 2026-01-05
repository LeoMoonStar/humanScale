// Keep backend alive by pinging every 3 minutes
// Render free tier spins down after 15 mins of inactivity

const BACKEND_URL = 'https://peoplecoin-api.onrender.com';
const FRONTEND_URL = 'https://peoplecoin-frontend.onrender.com';  
const PING_INTERVAL = 3 * 60 * 1000; // 3 minutes

async function pingBackend() {
  try {
    // Ping backend
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) {
      throw new Error(`Backend HTTP ${response.status}: ${response.statusText}`);
    }

    // Try to parse as JSON, fallback to text
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Backend alive:`, data);

    // Ping frontend
    const frontendResponse = await fetch(`${FRONTEND_URL}/health`);
    if (!frontendResponse.ok) {
      throw new Error(`Frontend HTTP ${frontendResponse.status}: ${frontendResponse.statusText}`);
    }

    const frontendContentType = frontendResponse.headers.get('content-type');
    let frontendData;
    if (frontendContentType && frontendContentType.includes('application/json')) {
      frontendData = await frontendResponse.json();
    } else {
      frontendData = await frontendResponse.text();
    }
    console.log(`[${new Date().toLocaleTimeString()}] ✓ Frontend alive:`, frontendData);
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ✗ Ping failed:`, error.message);
  }
}

// Ping immediately on start
console.log('🚀 Starting backend and frontend keep-alive service...');
console.log(`📍 Backend URL: ${BACKEND_URL}`);
console.log(`📍 Frontend URL: ${FRONTEND_URL}`);
console.log(`⏱️  Ping interval: ${PING_INTERVAL / 1000 / 60} minutes\n`);

pingBackend();

// Then ping every 3 minutes
setInterval(pingBackend, PING_INTERVAL);
