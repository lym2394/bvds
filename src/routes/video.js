const express = require('express');
const router = express.Router();
const axios = require('axios');
const bilibiliService = require('../services/bilibiliService');

/**
 * GET /api/video/info
 * 获取视频基本信息
 * Query参数:
 *   - bvid: BV号或视频链接（必填）
 *   - cookie: 用户Cookie（可选）
 */
router.get('/info', async (req, res, next) => {
  try {
    const { bvid, cookie } = req.query;
    
    if (!bvid) {
      return res.status(400).json({
        code: 400,
        message: '请提供BV号或视频链接',
        data: null
      });
    }

    const extractedBvid = bilibiliService.extractBvid(bvid);
    const videoInfo = await bilibiliService.getVideoInfo(extractedBvid, cookie || '');

    res.json({
      code: 0,
      message: 'success',
      data: videoInfo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/playurl
 * 获取视频播放地址
 * Query参数:
 *   - bvid: BV号或视频链接（必填）
 *   - cid: 分P的CID（可选，默认第1P）
 *   - qn: 画质代码（可选，默认80=1080P）
 *   - cookie: 用户Cookie（可选）
 */
router.get('/playurl', async (req, res, next) => {
  try {
    const { bvid, cid, qn, cookie } = req.query;
    
    if (!bvid) {
      return res.status(400).json({
        code: 400,
        message: '请提供BV号或视频链接',
        data: null
      });
    }

    const extractedBvid = bilibiliService.extractBvid(bvid);
    const quality = parseInt(qn) || 80;

    // 如果没有提供cid，先获取视频信息找到第1P的cid
    let targetCid = cid;
    if (!targetCid) {
      const videoInfo = await bilibiliService.getVideoInfo(extractedBvid, cookie || '');
      if (videoInfo.pages && videoInfo.pages.length > 0) {
        targetCid = videoInfo.pages[0].cid;
      } else {
        return res.status(400).json({
          code: 400,
          message: '无法获取视频CID',
          data: null
        });
      }
    }

    const playUrl = await bilibiliService.getVideoPlayUrl(
      extractedBvid, 
      targetCid, 
      quality, 
      cookie || ''
    );

    res.json({
      code: 0,
      message: 'success',
      data: playUrl
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/full
 * 获取视频全部信息（基本信息 + 播放地址）
 * Query参数:
 *   - bvid: BV号或视频链接（必填）
 *   - qn: 画质代码（可选，默认80=1080P）
 *   - page: 分P页码（可选，默认1）
 *   - cookie: 用户Cookie（可选）
 */
router.get('/full', async (req, res, next) => {
  try {
    const { bvid, qn, page, cookie } = req.query;
    
    if (!bvid) {
      return res.status(400).json({
        code: 400,
        message: '请提供BV号或视频链接',
        data: null
      });
    }

    const extractedBvid = bilibiliService.extractBvid(bvid);
    const quality = parseInt(qn) || 80;
    const pageNum = parseInt(page) || 1;

    const fullInfo = await bilibiliService.getVideoFullInfo(
      extractedBvid,
      quality,
      pageNum,
      cookie || ''
    );

    res.json({
      code: 0,
      message: 'success',
      data: fullInfo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/search
 * 搜索视频
 * Query参数:
 *   - keyword: 关键词（必填）
 *   - page: 页码（可选，默认1）
 *   - cookie: 用户Cookie（可选）
 */
router.get('/search', async (req, res, next) => {
  try {
    const { keyword, page, cookie } = req.query;
    
    if (!keyword) {
      return res.status(400).json({
        code: 400,
        message: '请提供搜索关键词',
        data: null
      });
    }

    const pageNum = parseInt(page) || 1;
    const searchResult = await bilibiliService.searchVideo(keyword, pageNum, cookie || '');

    res.json({
      code: 0,
      message: 'success',
      data: searchResult
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/quality-list
 * 获取画质代码对照表
 */
router.get('/quality-list', (req, res) => {
  res.json({
    code: 0,
    message: 'success',
    data: bilibiliService.QUALITY_MAP
  });
});

/**
 * GET /api/video/download
 * 代理下载视频/音频流（解决B站防盗链问题）
 * Query参数:
 *   - url: 视频/音频流地址（必填，需要URL编码）
 *   - filename: 下载文件名（可选）
 *   - type: 文件类型，video/audio（可选，默认video）
 */
router.get('/download', async (req, res, next) => {
  try {
    const { url, filename, type = 'video' } = req.query;
    
    if (!url) {
      return res.status(400).json({
        code: 400,
        message: '请提供下载地址',
        data: null
      });
    }

    const decodedUrl = decodeURIComponent(url);
    
    // 设置请求头，模拟浏览器从B站访问
    const headers = {
      'Referer': 'https://www.bilibili.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Origin': 'https://www.bilibili.com'
    };

    // 使用axios流式请求
    const response = await axios({
      method: 'GET',
      url: decodedUrl,
      headers: headers,
      responseType: 'stream',
      timeout: 30000,
      maxRedirects: 5
    });

    // 设置响应头
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    
    // 如果有文件名，设置下载头
    if (filename) {
      const safeFilename = decodeURIComponent(filename);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
    }

    // 如果有内容长度，也转发
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    // 转发数据流
    response.data.pipe(res);

    // 处理错误
    response.data.on('error', (err) => {
      console.error('下载流错误:', err.message);
      if (!res.headersSent) {
        res.status(500).json({
          code: 500,
          message: '下载失败: ' + err.message,
          data: null
        });
      }
    });

  } catch (error) {
    console.error('代理下载错误:', error.message);
    if (error.response) {
      // B站返回的错误
      res.status(error.response.status).json({
        code: error.response.status,
        message: '下载失败: ' + (error.response.data?.message || '无权访问'),
        data: null
      });
    } else {
      next(error);
    }
  }
});

module.exports = router;
