function success(response, data, statusCode = 200) {
  return response.status(statusCode).json({ success: true, data });
}

function failure(response, statusCode, code, message) {
  return response.status(statusCode).json({ success: false, error: { code, message } });
}

module.exports = { success, failure };
