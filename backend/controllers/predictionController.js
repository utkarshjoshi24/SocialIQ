const FLASK_TIMEOUT_MS = 10000;

/**
 * @desc    Forward a pre-publication post description to the Flask ML service
 * @route   POST /api/prediction
 * @access  Private
 */
export const getPrediction = async (req, res) => {
  const flaskUrl = process.env.FLASK_ANALYTICS_URL || 'http://localhost:5002';

  let response;
  try {
    response = await fetch(`${flaskUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
      signal: AbortSignal.timeout(FLASK_TIMEOUT_MS),
    });
  } catch (error) {
    console.error('[Prediction] ML service unreachable:', error.message);
    return res.status(503).json({ error: 'Prediction service is unavailable. Please try again later.' });
  }

  const data = await response.json().catch(() => null);
  if (!data) {
    console.error(`[Prediction] Invalid response from ML service (status ${response.status})`);
    return res.status(502).json({ error: 'Invalid response from prediction service' });
  }

  // Validation errors (4xx) are passed through so the client can show field messages;
  // ML-service failures are reported generically.
  if (response.status >= 500) {
    console.error(`[Prediction] ML service error ${response.status}:`, data.error);
    return res.status(response.status === 503 ? 503 : 502).json({
      error: 'Prediction service failed to process the request',
    });
  }

  return res.status(response.status).json(data);
};
