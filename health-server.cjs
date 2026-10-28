
const express = require('express');

const app = express();

const PORT = 3001;
app.use(express.json());

// Health status for each service
const serviceHealth = {
  'API Gateway': true,
  'Payment Service': true,
  'Inventory Service': true,
  'Orders Database': true,
};

const serviceRoutes = {
  payment: 'Payment Service',
  api: 'API Gateway',
  inventory: 'Inventory Service',
  database: 'Orders Database',
};

// Check the health of a service
app.get('/health/:service', (req, res) => {
  const serviceName = serviceRoutes[req.params.service];

  if (!serviceName) {
    return res.status(404).json({
      status: 'failed',
      message: 'Unknown service',
    });
  }

  const healthy = serviceHealth[serviceName];

  res.status(healthy ? 200 : 503).json({
    service: serviceName,
    status: healthy ? 'healthy' : 'failed',
  });
});

// Keep the existing Payment Service health endpoint working
app.get('/health', (req, res) => {
  const healthy = serviceHealth['Payment Service'];

  res.status(healthy ? 200 : 503).json({
    service: 'Payment Service',
    status: healthy ? 'healthy' : 'failed',
  });
});

// Simulate a service failure
app.post('/simulate-failure/:service', (req, res) => {
  const serviceName = serviceRoutes[req.params.service];

  if (!serviceName) {
    return res.status(404).json({
      message: 'Unknown service',
    });
  }

  serviceHealth[serviceName] = false;

  res.json({
    message: `${serviceName} is now unavailable`,
  });
});

// Restore a service
app.post('/restore/:service', (req, res) => {
  const serviceName = serviceRoutes[req.params.service];

  if (!serviceName) {
    return res.status(404).json({
      message: 'Unknown service',
    });
  }

  serviceHealth[serviceName] = true;

  res.json({
    message: `${serviceName} has recovered`,
  });
});

// Keep existing Payment Service buttons working
app.post('/simulate-failure', (req, res) => {
  serviceHealth['Payment Service'] = false;

  res.json({
    message: 'Payment Service is now unavailable',
  });
});

app.post('/restore', (req, res) => {
  serviceHealth['Payment Service'] = true;

  res.json({
    message: 'Payment Service has recovered',
  });
});




app.post('/monitor-check', async (req, res) => {
  const startedAt = Date.now();

  try {
    const endpoint = req.body?.url;

    if (typeof endpoint !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Please provide a valid HTTPS endpoint URL.',
      });
    }

    const parsedUrl = new URL(endpoint);

    if (
      parsedUrl.protocol !== 'https:' ||
      !['httpbin.org'].includes(parsedUrl.hostname)
    ) {
      return res.status(400).json({
        ok: false,
        error: 'For this first test, use https://httpbin.org/status/200.',
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let upstream;

    try {
      upstream = await fetch(parsedUrl.toString(), {
        method: 'GET',
        redirect: 'error',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const responseTime = Date.now() - startedAt;

    return res.status(200).json({
      ok: upstream.status >= 200 && upstream.status < 400,
      endpoint: parsedUrl.toString(),
      httpStatus: upstream.status,
      responseTime,
      result:
        upstream.status >= 200 && upstream.status < 400
          ? 'healthy'
          : 'unhealthy',
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      endpoint: req.body?.url ?? '',
      httpStatus: null,
      responseTime: Date.now() - startedAt,
      result: 'unhealthy',
      error:
        error.name === 'AbortError'
          ? 'The endpoint timed out after 8 seconds.'
          : error.message || 'Could not reach the endpoint.',
    });
  }
});


app.listen(PORT, () => {
  console.log(`Health server running at http://localhost:${PORT}`);
});
