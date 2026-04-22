import * as configurationService from "../services/configuration.service.js";

export async function handleGet(_req, res) {
  try {
    const row = await configurationService.getConfig();
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

export async function handleUpdate(req, res) {
  try {
    const row = await configurationService.updateConfig(req.body);
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}
