const express = require('express');
const cors = require('cors');
const videoRoutes = require('./routes/video');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: '*', // 允许所有来源，生产环境建议配置具体域名
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Cookie', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（前端页面）
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    code: 0,
    message: 'success',
    data: {
      status: 'ok',
      timestamp: Date.now(),
      version: '1.0.0'
    }
  });
});

// 视频相关路由
app.use('/api/video', videoRoutes);

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   B站视频下载后端服务已启动                                ║
║                                                           ║
║   服务地址: http://localhost:${PORT}                        ║
║                                                           ║
║   API文档:                                                 ║
║   - GET /api/health          健康检查                      ║
║   - GET /api/video/info       获取视频信息                  ║
║   - GET /api/video/playurl    获取视频播放地址              ║
║   - GET /api/video/full       获取视频完整信息              ║
║   - GET /api/video/search     搜索视频                      ║
║   - GET /api/video/quality-list  画质代码对照表             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
