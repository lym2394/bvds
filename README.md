# B站视频下载后端服务

基于 Node.js + Express 构建的 B 站视频下载后端 API 服务，支持最新的 WBI 签名机制，可获取高清视频播放地址。

## ✨ 功能特性

- ✅ **WBI 签名支持** - 适配 B 站最新的 WBI 签名接口
- ✅ **多画质支持** - 支持 360P 到 8K 全画质选择
- ✅ **DASH 格式** - 支持音视频分离的 DASH 格式
- ✅ **Cookie 登录** - 支持传入 Cookie 获取会员画质
- ✅ **视频搜索** - 内置视频搜索功能
- ✅ **分P支持** - 支持多P视频的选择
- ✅ **CORS 跨域** - 内置跨域支持，方便前端调用
- ✅ **错误处理** - 完善的错误处理机制

## 🚀 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm 或 yarn

### 安装依赖

```bash
cd bilibili-downloader-backend
npm install
```

### 启动服务

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

服务默认运行在 `http://localhost:3000`

## 📡 API 接口

### 1. 健康检查

```
GET /api/health
```

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "ok",
    "timestamp": 1700000000000,
    "version": "1.0.0"
  }
}
```

### 2. 获取视频信息

```
GET /api/video/info?bvid=BV1xx411c7mD
```

**参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| bvid | string | 是 | BV号或完整视频链接 |
| cookie | string | 否 | 用户Cookie（用于获取更高画质） |

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "bvid": "BV1xx411c7mD",
    "aid": 12345678,
    "title": "视频标题",
    "desc": "视频简介",
    "pic": "封面图URL",
    "owner": {
      "mid": 123456,
      "name": "UP主名称",
      "face": "头像URL"
    },
    "duration": 120,
    "pages": [
      {
        "cid": 12345678,
        "page": 1,
        "part": "P1标题",
        "duration": 120
      }
    ]
  }
}
```

### 3. 获取视频播放地址

```
GET /api/video/playurl?bvid=BV1xx411c7mD&qn=80
```

**参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| bvid | string | 是 | - | BV号或完整视频链接 |
| cid | number | 否 | 第1P | 分P的CID |
| qn | number | 否 | 80 | 画质代码（见画质对照表） |
| cookie | string | 否 | - | 用户Cookie |

**响应示例：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "quality": 80,
    "qualityDesc": "1080P",
    "type": "dash",
    "duration": 120.5,
    "videos": [
      {
        "id": 80,
        "baseUrl": "视频流地址",
        "backupUrl": ["备用地址1", "备用地址2"],
        "bandwidth": 2000000,
        "mimeType": "video/avc",
        "codecs": "avc1.640032",
        "width": 1920,
        "height": 1080,
        "quality": "1080P"
      }
    ],
    "audios": [
      {
        "id": 30280,
        "baseUrl": "音频流地址",
        "backupUrl": ["备用地址"],
        "bandwidth": 321328,
        "mimeType": "audio/mp4",
        "codecs": "mp4a.40.2"
      }
    ]
  }
}
```

### 4. 获取视频完整信息

```
GET /api/video/full?bvid=BV1xx411c7mD&qn=80&page=1
```

**参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| bvid | string | 是 | - | BV号或完整视频链接 |
| qn | number | 否 | 80 | 画质代码 |
| page | number | 否 | 1 | 分P页码 |
| cookie | string | 否 | - | 用户Cookie |

返回视频基本信息 + 播放地址的组合。

### 5. 搜索视频

```
GET /api/video/search?keyword=关键词&page=1
```

**参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 是 | - | 搜索关键词 |
| page | number | 否 | 1 | 页码 |
| cookie | string | 否 | - | 用户Cookie |

### 6. 画质代码对照表

```
GET /api/video/quality-list
```

## 🎨 画质代码对照表

| qn值 | 画质 | 权限要求 |
|------|------|----------|
| 16 | 360P | 无 |
| 32 | 480P | 无（访客默认） |
| 64 | 720P | 登录（Web默认） |
| 74 | 720P60 | 登录 |
| 80 | 1080P | 登录（TV/APP默认） |
| 112 | 1080P+ | 大会员 |
| 116 | 1080P60 | 大会员 |
| 120 | 4K | 大会员（需fnval&128和fourk=1） |
| 125 | HDR | 大会员（需fnval&64） |
| 126 | 杜比视界 | 大会员（需fnval&512） |
| 127 | 8K | 大会员（需fnval&1024） |

## 📁 项目结构

```
bilibili-downloader-backend/
├── src/
│   ├── index.js              # 主入口文件
│   ├── routes/
│   │   └── video.js          # 视频相关路由
│   ├── services/
│   │   └── bilibiliService.js # B站API服务层
│   ├── utils/
│   │   └── wbiSign.js        # WBI签名工具
│   └── middleware/
│       └── errorHandler.js   # 错误处理中间件
├── package.json
└── README.md
```

## 🔧 技术说明

### WBI 签名机制

WBI（Web Interface Signature）是 B 站最新的接口签名验证方式：

1. 从导航接口获取 `img_key` 和 `sub_key`
2. 将两个 key 按固定规则混合得到 32 位密钥
3. 对请求参数按字典序排序
4. 拼接参数 + 混合密钥 + 时间戳，计算 MD5 得到 `w_rid`
5. 请求时携带 `w_rid` 和 `wts`（时间戳）参数

### 视频格式说明

- **DASH 格式**（推荐）：音视频分离，支持高清，需要自行合并音视频
- **直链格式**：音视频合并的单一文件，画质选择较少

### Cookie 获取方式

1. 浏览器登录 B 站
2. 按 F12 打开开发者工具
3. 切换到 Network（网络）面板
4. 刷新页面，找到任意一个请求
5. 在请求头中找到 Cookie 字段，复制完整值

> ⚠️ **安全提示**：Cookie 包含敏感信息，请勿分享给他人，仅在本地使用。

## ⚠️ 注意事项

1. **频率限制**：单 IP 每秒超过 5 次请求可能触发临时限制
2. **版权问题**：请遵守版权法规，下载的视频仅供个人学习使用
3. **接口变更**：B 站 API 可能随时变更，如遇问题请及时更新
4. **防盗链**：视频流地址有防盗链，下载时需携带正确的 Referer 头

## 📝 常见问题

**Q: 为什么获取不到 1080P 以上画质？**
A: 高画质需要登录且是大会员账号，请传入有效的 Cookie。

**Q: 提示 WBI 签名无效怎么办？**
A: 密钥会定期更新，服务内置了缓存机制，一般会自动刷新。如持续报错请重启服务。

**Q: DASH 格式的视频怎么播放？**
A: DASH 格式音视频是分离的，可以使用：
- 在线播放器：如 DPlayer、ArtPlayer 等支持 DASH 的播放器
- 本地播放器：PotPlayer、VLC 等
- 合并工具：使用 ffmpeg 合并音视频

**Q: 如何合并 DASH 音视频？**
```bash
ffmpeg -i video.m4s -i audio.m4s -c copy output.mp4
```

## 📄 许可证

MIT License

## ⚖️ 免责声明

本项目仅供学习研究使用，请遵守相关法律法规和 B 站用户协议，请勿用于商业用途。
