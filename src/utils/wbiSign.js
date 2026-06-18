const CryptoJS = require('crypto-js');

// WBI签名密钥缓存
let wbiKeysCache = {
  imgKey: '',
  subKey: '',
  expireTime: 0
};

/**
 * 获取WBI签名密钥
 * @param {string} cookie - 用户Cookie（可选）
 * @returns {Promise<{imgKey: string, subKey: string}>}
 */
async function getWbiKeys(cookie = '') {
  const now = Date.now();
  
  // 检查缓存是否有效（缓存1小时）
  if (wbiKeysCache.imgKey && wbiKeysCache.subKey && now < wbiKeysCache.expireTime) {
    return {
      imgKey: wbiKeysCache.imgKey,
      subKey: wbiKeysCache.subKey
    };
  }

  try {
    const axios = require('axios');
    const response = await axios.get('https://api.bilibili.com/x/web-interface/nav', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
        'Cookie': cookie
      }
    });

    const data = response.data;
    
    // 未登录时code=-101，但仍然有wbi_img数据
    if (!data.data || !data.data.wbi_img) {
      throw new Error(`获取WBI密钥失败: ${data.message || '未知错误'}`);
    }

    const wbiImg = data.data.wbi_img;
    const imgKey = wbiImg.img_url.split('/').pop().split('.')[0];
    const subKey = wbiImg.sub_url.split('/').pop().split('.')[0];

    // 更新缓存
    wbiKeysCache = {
      imgKey,
      subKey,
      expireTime: now + 3600 * 1000 // 1小时过期
    };

    return { imgKey, subKey };
  } catch (error) {
    console.error('获取WBI密钥出错:', error.message);
    throw error;
  }
}

/**
 * 生成WBI签名
 * @param {object} params - 请求参数
 * @param {string} imgKey - img_key
 * @param {string} subKey - sub_key
 * @returns {{w_rid: string, wts: number}}
 */
function generateWbiSign(params, imgKey, subKey) {
  const mixinKeyEncTab = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
  ];

  // 拼接img_key和sub_key
  const mixinKey = imgKey + subKey;
  
  // 使用固定的混合顺序获取32位密钥
  let mixedKey = '';
  for (let i = 0; i < 32; i++) {
    mixedKey += mixinKey[mixinKeyEncTab[i]];
  }

  // 排序参数
  const sortedParams = {};
  Object.keys(params).sort().forEach(key => {
    sortedParams[key] = params[key];
  });

  // 构建查询字符串
  const query = new URLSearchParams(sortedParams).toString();
  
  // 生成时间戳
  const wts = Math.floor(Date.now() / 1000);
  
  // 计算签名
  const signStr = query + mixedKey + wts;
  const wRid = CryptoJS.MD5(signStr).toString();

  return {
    w_rid: wRid,
    wts: wts
  };
}

/**
 * 给参数添加WBI签名
 * @param {object} params - 请求参数
 * @param {string} cookie - 用户Cookie（可选）
 * @returns {Promise<object>} 带签名的参数
 */
async function addWbiSign(params, cookie = '') {
  const { imgKey, subKey } = await getWbiKeys(cookie);
  const { w_rid, wts } = generateWbiSign(params, imgKey, subKey);
  
  return {
    ...params,
    w_rid,
    wts
  };
}

module.exports = {
  getWbiKeys,
  generateWbiSign,
  addWbiSign
};
