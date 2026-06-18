/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  console.error(err.stack);

  // 默认错误状态码和消息
  let statusCode = 500;
  let message = '服务器内部错误';

  // 根据错误类型设置不同的响应
  if (err.message.includes('请提供') || err.message.includes('无法识别')) {
    statusCode = 400;
    message = err.message;
  } else if (err.message.includes('需要登录') || err.message.includes('Cookie')) {
    statusCode = 401;
    message = err.message;
  } else if (err.message.includes('不存在') || err.message.includes('找不到')) {
    statusCode = 404;
    message = err.message;
  } else if (err.message.includes('签名无效') || err.message.includes('过期')) {
    statusCode = 403;
    message = err.message;
  } else if (err.message.includes('频率') || err.message.includes('限制')) {
    statusCode = 429;
    message = err.message;
  } else if (err.message) {
    message = err.message;
  }

  res.status(statusCode).json({
    code: statusCode,
    message: message,
    data: null
  });
}

/**
 * 404处理中间件
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
