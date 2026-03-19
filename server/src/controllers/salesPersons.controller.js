import { listSalesPersons } from "../services/salesPersons.service.js";

export async function handleList(req, res) {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const result = await listSalesPersons({ search, page, limit });
    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}
