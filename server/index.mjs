import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseReplies, parseReplyPage, parseTimeline } from './feed.mjs';
import { systemProxy } from './proxy.mjs';

const envFile = process.env.FEEDLENS_ENV_FILE || '.env';
dotenv.config({ path: envFile });
const app = express();
const proxy = systemProxy();
const staticDir = process.env.FEEDLENS_STATIC_DIR;
let listeningPort;
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  const origin = req.get('origin');
  const host = req.get('host');
  const localHosts = [`127.0.0.1:${listeningPort}`, `localhost:${listeningPort}`];
  if (staticDir && !localHosts.includes(host)) return res.sendStatus(403);
  const allowedOrigins = staticDir
    ? localHosts.map((value) => `http://${value}`)
    : ['http://127.0.0.1:5173', 'http://localhost:5173'];
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: '来源不被允许。' });
  }
  next();
});

app.get('/api/settings', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ configured: Boolean(process.env.X_AUTH_TOKEN && process.env.X_CT0) });
});

app.get('/api/preferences', async (req, res) => {
  if (!staticDir) return res.json({ persistent: false });
  try {
    const preferencesFile = path.join(path.dirname(envFile), 'preferences.json');
    const preferences = JSON.parse(await readFile(preferencesFile, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return '{}';
      throw error;
    }));
    res.set('Cache-Control', 'no-store');
    res.json({ persistent: true, preferences });
  } catch {
    res.status(500).json({ error: '无法读取本地偏好设置。' });
  }
});

app.put('/api/preferences', async (req, res) => {
  if (!staticDir || !req.get('origin') || req.get('x-tw-view') !== 'preferences') return res.sendStatus(403);
  const { language, theme, shortcut } = req.body || {};
  if (!['zh-CN', 'en', 'ja', 'ko', 'fr', 'de', 'es'].includes(language)
      || !['system', 'light', 'dark'].includes(theme)
      || typeof shortcut !== 'string' || !shortcut || shortcut.length > 80) return res.sendStatus(400);
  try {
    const preferencesFile = path.join(path.dirname(envFile), 'preferences.json');
    await writeFile(preferencesFile, JSON.stringify({ language, theme, shortcut }), { encoding: 'utf8', mode: 0o600 });
    res.json({ saved: true });
  } catch {
    res.status(500).json({ error: '无法保存本地偏好设置。' });
  }
});

app.put('/api/settings', async (req, res) => {
  if (!req.get('origin') || req.get('x-tw-view') !== 'settings') return res.sendStatus(403);
  const { authToken, ct0 } = req.body || {};
  if (typeof authToken !== 'string' || typeof ct0 !== 'string'
      || !/^[a-zA-Z0-9_-]{1,512}$/.test(authToken) || !/^[a-zA-Z0-9_-]{1,512}$/.test(ct0)) {
    return res.status(400).json({ error: '请填写有效的 auth_token 和 ct0。' });
  }
  try {
    let content = await readFile(envFile, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return '';
      throw error;
    });
    for (const [key, value] of Object.entries({ X_AUTH_TOKEN: authToken, X_CT0: ct0 })) {
      const line = `${key}=${value}`;
      const pattern = new RegExp(`^${key}=.*$`, 'm');
      content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
    }
    await writeFile(envFile, content, { encoding: 'utf8', mode: 0o600 });
    process.env.X_AUTH_TOKEN = authToken;
    process.env.X_CT0 = ct0;
    res.json({ configured: true });
  } catch {
    res.status(500).json({ error: '无法保存本地配置。' });
  }
});

app.post('/api/translate', async (req, res) => {
  if (!req.get('origin') || req.get('x-tw-view') !== 'translate') return res.sendStatus(403);
  const { text, target } = req.body || {};
  if (typeof text !== 'string' || !text.trim() || text.length > 5000
      || !['zh-CN', 'en', 'ja', 'ko', 'fr', 'de', 'es'].includes(target)) return res.sendStatus(400);
  try {
    const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
      params: { client: 'gtx', sl: 'auto', tl: target, dt: 't', q: text }, timeout: 8000, proxy,
    });
    res.json({ text: response.data[0].map((part) => part[0]).join('') });
  } catch {
    try {
      const source = /[\u3040-\u30ff]/u.test(text) ? 'ja' : /[\uac00-\ud7af]/u.test(text) ? 'ko'
        : /[\u4e00-\u9fff]/u.test(text) ? 'zh-CN' : 'en';
      const chunks = text.match(/[^\n]{1,120}/gu) || [];
      const translated = [];
      for (const chunk of chunks) {
        const response = await axios.get('https://api.mymemory.translated.net/get', {
          params: { q: chunk, langpair: `${source}|${target}` }, timeout: 10000, proxy,
        });
        if (response.data.responseStatus !== 200) throw new Error('translation failed');
        translated.push(response.data.responseData.translatedText);
      }
      res.json({ text: translated.join('\n') });
    } catch {
      res.status(502).json({ error: '翻译服务不可用，请稍后重试。' });
    }
  }
});

app.get('/api/video', async (req, res) => {
  let url;
  try { url = new URL(req.query.url); } catch { return res.sendStatus(400); }
  if (url.protocol !== 'https:' || url.hostname !== 'video.twimg.com' || url.port || url.username || url.password) {
    return res.sendStatus(400);
  }
  try {
    const response = await axios.get(url.href, {
      responseType: 'stream', timeout: 30000, maxRedirects: 0, proxy,
      headers: req.get('range') ? { range: req.get('range') } : {},
      validateStatus: (status) => status === 200 || status === 206,
    });
    for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      if (response.headers[header]) res.set(header, response.headers[header]);
    }
    res.status(response.status);
    response.data.on('error', () => res.destroy());
    response.data.pipe(res);
    res.on('close', () => response.data.destroy());
  } catch {
    res.sendStatus(502);
  }
});
const bearer = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const enabled = [
  'creator_subscriptions_tweet_preview_api_enabled', 'c9s_tweet_anatomy_moderator_badge_enabled',
  'tweetypie_unmention_optimization_enabled', 'responsive_web_edit_tweet_api_enabled',
  'graphql_is_translatable_rweb_tweet_is_translatable_enabled', 'view_counts_everywhere_api_enabled',
  'longform_notetweets_consumption_enabled', 'responsive_web_twitter_article_tweet_consumption_enabled',
  'longform_notetweets_rich_text_read_enabled', 'longform_notetweets_inline_media_enabled',
  'rweb_video_timestamps_enabled', 'responsive_web_graphql_exclude_directive_enabled',
  'freedom_of_speech_not_reach_fetch_enabled', 'standardized_nudges_misinfo',
  'tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled',
  'responsive_web_graphql_timeline_navigation_enabled',
];
const disabled = [
  'tweet_awards_web_tipping_enabled', 'verified_phone_label_enabled',
  'responsive_web_media_download_video_enabled',
  'responsive_web_graphql_skip_user_profile_image_extensions_enabled',
  'responsive_web_enhance_cards_enabled',
];
const features = Object.fromEntries([
  ...enabled.map((name) => [name, true]), ...disabled.map((name) => [name, false]),
]);

function credentials() {
  const { X_AUTH_TOKEN: auth, X_CT0: csrf } = process.env;
  if (!auth || !csrf || /[;\r\n]/.test(auth + csrf)) return null;
  return {
    authorization: `Bearer ${bearer}`, 'x-csrf-token': csrf,
    'x-twitter-active-user': 'yes', 'x-twitter-auth-type': 'OAuth2Session',
    cookie: `auth_token=${auth}; ct0=${csrf}`,
    'user-agent': 'Mozilla/5.0', referer: 'https://x.com/',
  };
}

app.get('/api/posts/:id/replies', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: '帖子 ID 无效。' });
  const headers = credentials();
  if (!headers) return res.status(503).json({ error: '本地认证配置缺失或无效。' });
  const queryId = process.env.X_DETAIL_QUERY_ID || 'U0HTv-bAWTBYylwEMT7x5A';
  if (!/^[\w-]+$/.test(queryId)) return res.status(400).json({ error: '详情查询 ID 无效。' });
  const variables = {
    focalTweetId: req.params.id, with_rux_injections: false, includePromotedContent: false,
    withCommunity: true, withQuickPromoteEligibilityTweetFields: true,
    withBirdwatchNotes: true, withVoice: true, withV2Timeline: true,
  };
  if (req.query.cursor !== undefined) {
    if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 4096) {
      return res.status(400).json({ error: '评论分页游标无效。' });
    }
    variables.cursor = req.query.cursor;
  }
  try {
    const response = await axios.get(`https://x.com/i/api/graphql/${queryId}/TweetDetail`, {
      headers, timeout: 20000,
      params: {
        variables: JSON.stringify(variables), features: JSON.stringify(features),
        fieldToggles: JSON.stringify({ withAuxiliaryUserLabels: false }),
      },
    });
    if (response.data.errors?.length) throw new Error('X detail API error');
    res.json(req.query.full === '1'
      ? parseReplyPage(response.data, req.params.id)
      : { replies: parseReplies(response.data, req.params.id) });
  } catch (error) {
    const message = error.response?.status === 429 ? '请求过于频繁，请稍后重试。' : '评论暂时无法加载。';
    res.status(502).json({ error: message });
  }
});

app.get('/api/feed', async (req, res) => {
  const { X_AUTH_TOKEN: auth, X_CT0: csrf, X_HOME_QUERY_ID: queryId = '-X_hcgQzmHGl29-UXxz4sw' } = process.env;
  if (!auth || !csrf) return res.status(503).json({ error: '请先在项目 .env 文件中配置 X_AUTH_TOKEN 和 X_CT0。' });
  if (!/^[\w-]+$/.test(queryId) || /[;\r\n]/.test(auth + csrf)) {
    return res.status(400).json({ error: '本地认证配置格式无效。' });
  }
  const variables = { count: 20, includePromotedContent: false, latestControlAvailable: true, requestContext: 'launch' };
  if (typeof req.query.cursor === 'string' && req.query.cursor.length < 4096) variables.cursor = req.query.cursor;
  try {
    const response = await axios.post(`https://x.com/i/api/graphql/${queryId}/HomeTimeline`,
      { variables, features, queryId }, {
        timeout: 20000,
        headers: credentials(),
      });
    if (response.data.errors?.length) throw new Error('X 返回接口错误，请检查登录状态或更新查询 ID。');
    res.json(parseTimeline(response.data));
  } catch (error) {
    const status = error.response?.status;
    const message = status === 401 || status === 403 ? 'X 登录已失效或请求被拒绝，请更新本地 Cookie。'
      : status === 429 ? '请求过于频繁，请稍后重试。'
        : '无法获取推荐内容。请检查网络、登录状态或更新查询 ID。';
    res.status(502).json({ error: message });
  }
});

if (staticDir) app.use(express.static(staticDir));

const port = process.env.FEEDLENS_PORT === undefined ? 3458 : Number(process.env.FEEDLENS_PORT);
const server = app.listen(port, '127.0.0.1', () => {
  listeningPort = server.address().port;
  if (process.send) process.send({ type: 'ready', port: listeningPort });
  else console.log(`Feed proxy listening on http://127.0.0.1:${listeningPort}`);
});
if (process.send) process.on('disconnect', () => server.close());
