export default function handler(req, res) {
  res.json({
    message: 'Root API is working!',
    timestamp: new Date().toISOString(),
  });
}
