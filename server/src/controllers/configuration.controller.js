import { getConfig } from "../services/configuration.service.js";

export async function handleGetConfig(req, res) {
  try {
    const value = await getConfig(req.params.key);
    if (value === null)
      return res.status(404).json({ success: false, error: { message: "Config key not found" } });
    res.json({ success: true, data: { key: req.params.key, value } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
