const axios = require('axios');
const { addWbiSign } = require('../utils/wbiSign');

// 常量定义
const BILI_API_BASE = 'https://api.bilibili.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER = 'https://www.bilibili.com';

// 画质代码映射
const QUALITY_MAP = {
  16: '360P',
  32: '480P',
  64: '720P',
  74: '720P60',
  80: '1080P',
  112: '1080P+',
  116: '1080P60',
  120: '4K',
  125: 'HDR',
  126: '杜比视界',
  127: '8K'
};

/**
 * 创建axios实例
 */
const biliClient = axios.create({
  baseURL: BILI_API_BASE,
  headers: {
    'User-Agent': USER_AGENT,
    'Referer': REFERER
  },
  timeout: 15000
});

/**
 * 从BV号或URL中提取BV号
 * @param {string} input - BV号或视频URL
 * @returns {string} BV号
 */
function extractBvid(input) {
  if (!input) throw new Error('请提供BV号或视频链接');
  
  // 匹配BV号
  const bvMatch = input.match(/BV[a-zA-Z0-9]+/);
  if (bvMatch) return bvMatch[0];
  
  // 匹配短链接 b23.tv
  if (input.includes('b23.tv')) {
    throw new Error('短链接需要先解析，请提供完整的BV号');
  }
  
  throw new Error('无法识别的视频链接或BV号');
}

/**
 * 获取视频基本信息
 * @param {string} bvid - BV号
 * @param {string} cookie - 用户Cookie（可选）
 * @returns {Promise<object>} 视频信息
 */
async function getVideoInfo(bvid, cookie = '') {
  try {
    const params = { bvid };
    const signedParams = await addWbiSign(params, cookie);
    
    const response = await biliClient.get('/x/web-interface/view', {
      params: signedParams,
      headers: {
        Cookie: cookie
      }
    });

    const data = response.data;
    if (data.code !== 0) {
      throw new Error(data.message || '获取视频信息失败');
    }

    const videoData = data.data;
    return {
      bvid: videoData.bvid,
      aid: videoData.aid,
      title: videoData.title,
      desc: videoData.desc,
      pic: videoData.pic,
      owner: {
        mid: videoData.owner.mid,
        name: videoData.owner.name,
        face: videoData.owner.face
      },
      stat: {
        view: videoData.stat.view,
        danmaku: videoData.stat.danmaku,
        reply: videoData.stat.reply,
        favorite: videoData.stat.favorite,
        coin: videoData.stat.coin,
        share: videoData.stat.share,
        like: videoData.stat.like
      },
      duration: videoData.duration,
      pages: videoData.pages.map(p => ({
        cid: p.cid,
        page: p.page,
        part: p.part,
        duration: p.duration,
        dimension: p.dimension
      })),
      publishTime: videoData.pubdate
    };
  } catch (error) {
    console.error('获取视频信息出错:', error.message);
    throw error;
  }
}

/**
 * 获取视频播放地址
 * @param {string} bvid - BV号
 * @param {number} cid - 分P的CID
 * @param {number} qn - 画质代码（默认1080P）
 * @param {string} cookie - 用户Cookie（可选）
 * @returns {Promise<object>} 播放地址信息
 */
async function getVideoPlayUrl(bvid, cid, qn = 80, cookie = '') {
  try {
    const params = {
      bvid,
      cid,
      qn,
      fnval: 144, // 16 (DASH) | 128 (4K) = 144
      fourk: 1,
      platform: 'pc',
      high_quality: 1
    };

    const signedParams = await addWbiSign(params, cookie);

    const response = await biliClient.get('/x/player/wbi/playurl', {
      params: signedParams,
      headers: {
        Cookie: cookie
      }
    });

    const data = response.data;
    if (data.code !== 0) {
      // 处理常见错误
      switch (data.code) {
        case -10403:
          throw new Error('该画质需要登录，请提供有效的Cookie');
        case -403:
          throw new Error('WBI签名无效或已过期，请重试');
        case -404:
          throw new Error('视频不存在或BV号错误');
        default:
          throw new Error(data.message || '获取视频播放地址失败');
      }
    }

    const playData = data.data;
    
    // 格式化返回结果
    const result = {
      quality: playData.quality,
      qualityDesc: QUALITY_MAP[playData.quality] || '未知',
      format: playData.format,
      timelength: playData.timelength,
      acceptQuality: playData.accept_quality,
      acceptDescription: playData.accept_description,
      videoCodecId: playData.video_codecid
    };

    // DASH格式（音视频分离）
    if (playData.dash) {
      result.type = 'dash';
      result.duration = playData.dash.duration;
      result.minBufferTime = playData.dash.minBufferTime;
      
      // 视频流列表
      result.videos = playData.dash.video.map(v => ({
        id: v.id,
        baseUrl: v.baseUrl,
        backupUrl: v.backupUrl,
        bandwidth: v.bandwidth,
        mimeType: v.mimeType,
        codecs: v.codecs,
        width: v.width,
        height: v.height,
        frameRate: v.frameRate,
        quality: QUALITY_MAP[v.id] || v.id
      }));

      // 音频流列表
      result.audios = playData.dash.audio.map(a => ({
        id: a.id,
        baseUrl: a.baseUrl,
        backupUrl: a.backupUrl,
        bandwidth: a.bandwidth,
        mimeType: a.mimeType,
        codecs: a.codecs
      }));

      // 杜比音频（如果有）
      if (playData.dash.dolby && playData.dash.dolby.audio) {
        result.dolbyAudio = playData.dash.dolby.audio.map(a => ({
          id: a.id,
          baseUrl: a.baseUrl,
          backupUrl: a.backupUrl,
          bandwidth: a.bandwidth,
          mimeType: a.mimeType,
          codecs: a.codecs
        }));
      }
    }

    // FLV/MP4直链（如果有）
    if (playData.durl) {
      result.type = 'direct';
      result.durls = playData.durl.map(d => ({
        order: d.order,
        length: d.length,
        size: d.size,
        url: d.url,
        backupUrl: d.backup_url
      }));
    }

    return result;
  } catch (error) {
    console.error('获取视频播放地址出错:', error.message);
    throw error;
  }
}

/**
 * 获取视频全部信息（基本信息 + 播放地址）
 * @param {string} bvid - BV号
 * @param {number} qn - 画质代码
 * @param {number} page - 分P页码（从1开始）
 * @param {string} cookie - 用户Cookie（可选）
 * @returns {Promise<object>}
 */
async function getVideoFullInfo(bvid, qn = 80, page = 1, cookie = '') {
  try {
    const videoInfo = await getVideoInfo(bvid, cookie);
    
    // 获取指定分P的CID
    const pageInfo = videoInfo.pages.find(p => p.page === page) || videoInfo.pages[0];
    if (!pageInfo) {
      throw new Error('找不到指定的分P');
    }

    const playUrl = await getVideoPlayUrl(bvid, pageInfo.cid, qn, cookie);

    return {
      ...videoInfo,
      currentPage: pageInfo,
      playUrl
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 搜索视频
 * @param {string} keyword - 关键词
 * @param {number} page - 页码
 * @param {string} cookie - 用户Cookie（可选）
 * @returns {Promise<object>}
 */
async function searchVideo(keyword, page = 1, cookie = '') {
  try {
    const params = {
      keyword,
      page,
      page_size: 20,
      order: 'totalrank'
    };

    const signedParams = await addWbiSign(params, cookie);

    const response = await biliClient.get('/x/web-interface/search/type', {
      params: {
        ...signedParams,
        search_type: 'video'
      },
      headers: {
        Cookie: cookie
      }
    });

    const data = response.data;
    if (data.code !== 0) {
      throw new Error(data.message || '搜索失败');
    }

    return {
      page: data.data.page,
      pageSize: data.data.pagesize,
      total: data.data.numResults,
      results: data.data.result.map(v => ({
        bvid: v.bvid,
        aid: v.aid,
        title: v.title.replace(/<em class="keyword">|<\/em>/g, ''),
        pic: 'https:' + v.pic,
        author: v.author,
        mid: v.mid,
        duration: v.duration,
        play: v.play,
        videoReview: v.video_review,
        pubdate: v.pubdate
      }))
    };
  } catch (error) {
    console.error('搜索视频出错:', error.message);
    throw error;
  }
}

module.exports = {
  extractBvid,
  getVideoInfo,
  getVideoPlayUrl,
  getVideoFullInfo,
  searchVideo,
  QUALITY_MAP
};
