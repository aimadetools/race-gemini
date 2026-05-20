export default async function handler(req, res) {
  try {
    return res.status(200).json({ status: "ok", message: "Hello from test-db endpoint!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
