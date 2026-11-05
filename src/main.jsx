import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { ArrowLeft, ArrowUp, BarChart2, BadgeCheck, ExternalLink, Gift, Heart, Languages, MessageCircle, RefreshCw, Repeat2, Settings as SettingsIcon, Eye, PanelTopOpen } from 'lucide-react';
import { ConfigProvider, Image, theme as antdTheme } from 'antd';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { mergePosts } from '../server/feed.mjs';
import { observeMore } from './auto-load.mjs';
import { hasForeignText, shortcutMatches } from './preferences.mjs';
import { Settings } from './settings.jsx';
import { Video } from './video.jsx';
import { createSelectionTranslator } from './selection-translation.mjs';
import { summarizePostText } from './post-text.mjs';
import { SponsorModal } from './sponsor.jsx';
import { installExternalLinkBridge } from './external-links.mjs';
import './style.css';
import './replies.css';
import './enhancements.css';

const Preferences = React.createContext({ language: 'zh-CN' });
async function translate(text, target) {
  const result = await axios.post('/api/translate', { text, target }, { headers: { 'x-tw-view': 'translate' } });
  return result.data.text;
}

const number = (value) => new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
function relative(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}天`;
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(date));
}

const pendingReplies = [];
let activeReplies = 0;
function requestReplies(postId) {
  return new Promise((resolve, reject) => {
    pendingReplies.push({ postId, resolve, reject });
    runReplyQueue();
  });
}

function runReplyQueue() {
  while (activeReplies < 3 && pendingReplies.length) {
    const request = pendingReplies.shift();
    activeReplies += 1;
    axios.get(`/api/posts/${encodeURIComponent(request.postId)}/replies`)
      .then((response) => request.resolve(response.data.replies))
      .catch(request.reject)
      .finally(() => { activeReplies -= 1; runReplyQueue(); });
  }
}

function Reply({ reply }) {
  const { language } = React.useContext(Preferences);
  const [translation, setTranslation] = useState('');
  const [translating, setTranslating] = useState(false);
  const translateReply = async () => {
    setTranslating(true);
    try { setTranslation(await translate(reply.text, language)); }
    catch { setTranslation('翻译失败，请稍后重试。'); }
    finally { setTranslating(false); }
  };
  return <div className="reply">
    {reply.author.avatar ? <img className="reply-avatar" src={reply.author.avatar} alt="" loading="lazy" />
      : <div className="reply-avatar placeholder">{reply.author.name.slice(0, 1)}</div>}
    <div className="reply-content">
      <div className="reply-meta"><strong>{reply.author.name}</strong><span>@{reply.author.handle}</span><span>·</span><span>{relative(reply.createdAt)}</span></div>
      <div className="reply-text">{reply.text}</div>
      {reply.text && <button className="translate-button" onClick={translateReply} disabled={translating} title="翻译评论" aria-label="翻译评论">
        <Languages size={15} />{translating ? '翻译中' : '翻译'}
      </button>}
      {translation && <div className="translation reply-translation">{translation}</div>}
    </div>
  </div>;
}

function Replies({ post, onOpen }) {
  const [replies, setReplies] = useState([]);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    setStatus('loading');
    requestReplies(post.id).then((items) => {
      if (mounted) { setReplies(items); setStatus('done'); }
    }).catch(() => { if (mounted) setStatus('error'); });
    return () => { mounted = false; };
  }, [post.id, attempt]);

  return <div className="replies">
    <div className="replies-heading">
      <span>评论</span>
      {onOpen && <button className="post-action" title="查看帖子详情" aria-label="查看帖子详情" onClick={() => onOpen(post)}>
        <PanelTopOpen size={16} />
      </button>}
    </div>
    {status === 'loading' && <div className="reply-status">正在加载评论...</div>}
    {status === 'error' && <button className="reply-retry" onClick={() => setAttempt((value) => value + 1)}>评论加载失败，点击重试</button>}
    {status === 'done' && replies.length === 0 && <div className="reply-status">暂无可展示的评论</div>}
    {status === 'done' && replies.map((reply) => <Reply reply={reply} key={reply.id} />)}
  </div>;
}

function Post({ post, onOpen, detail = false }) {
  const { language } = React.useContext(Preferences);
  const [translation, setTranslation] = useState('');
  const [translating, setTranslating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const textSummary = summarizePostText(post.text);
  const translatePost = async () => {
    setTranslating(true);
    try { setTranslation(await translate(post.text, language)); }
    catch { setTranslation('翻译失败，请稍后重试。'); }
    finally { setTranslating(false); }
  };
  const link = `https://x.com/${encodeURIComponent(post.author.handle)}/status/${post.id}`;
  return <article className="post">
    <a className="avatar-link" href={`https://x.com/${encodeURIComponent(post.author.handle)}`} target="_blank" rel="noreferrer">
      {post.author.avatar ? <img className="avatar" src={post.author.avatar} alt="" /> : <div className="avatar placeholder">{post.author.name.slice(0, 1)}</div>}
    </a>
    <div className="post-content">
      <div className="post-head">
        <span className="author">{post.author.name}</span>
        {post.author.verified && <BadgeCheck className="x-verified" size={17} fill="#1d9bf0" stroke="white" strokeWidth={2} />}
        <span className="handle">@{post.author.handle}</span><span className="dot">·</span>
        <a className="time" href={link} target="_blank" rel="noreferrer">{relative(post.createdAt)}</a>
        <a className="open" href={link} target="_blank" rel="noreferrer" title="在 X 中打开" aria-label="在 X 中打开"><ExternalLink size={15} /></a>
        {onOpen && <button className="post-action" title="查看帖子详情" aria-label="查看帖子详情" onClick={() => onOpen(post)}><PanelTopOpen size={16} /></button>}
      </div>
      <div className="post-text">{!detail && !expanded && textSummary.truncated ? `${textSummary.preview}…` : post.text}</div>
      {!detail && textSummary.truncated && <div className="post-text-controls">
        <button onClick={() => setExpanded((value) => !value)}>{expanded ? '收起全文' : '展开全文'}</button>
        <span>{expanded ? textSummary.length : textSummary.shown} / {textSummary.length} 字符</span>
      </div>}
      {post.text && <button className="translate-button" onClick={translatePost} disabled={translating} title="翻译帖子"><Languages size={15} />{translating ? '翻译中' : '翻译'}</button>}
      {translation && <div className="translation">{translation}</div>}
      {post.media.length > 0 && <div className={`media media-${Math.min(post.media.length, 4)}`}>
        <Image.PreviewGroup>{post.media.slice(0, 4).map((item, index) => item.video
          ? <Video key={index} src={item.video} poster={item.url} />
          : <Image key={index} src={item.url} alt="帖子图片" loading="lazy" preview={{ mask: false }} />)}</Image.PreviewGroup>
      </div>}
      <div className="metrics">
        <span><MessageCircle size={16} />{number(post.replies)}</span>
        <span><Repeat2 size={17} />{number(post.reposts)}</span>
        <span><Heart size={16} />{number(post.likes)}</span>
        <span><BarChart2 size={16} />{number(post.views)}</span>
      </div>
      {!detail && post.replies > 0 && <Replies post={post} onOpen={onOpen} />}
    </div>
  </article>;
}

function Detail({ post, onBack }) {
  const [replies, setReplies] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const sentinel = useRef(null);
  const overlay = useRef(null);
  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/posts/${encodeURIComponent(post.id)}/replies`, {
        params: { full: 1, ...(cursor ? { cursor } : {}) },
      });
      setReplies((current) => mergePosts(current, response.data.replies));
      setCursor(response.data.nextCursor === cursor ? null : response.data.nextCursor);
      setStarted(true);
    } catch (failure) {
      setError(failure.response?.data?.error || '评论加载失败，请重试。');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [post.id, cursor]);

  useEffect(() => { load(); }, []);
  useEffect(() => { overlay.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!started || !cursor || loading || error) return undefined;
    return observeMore(sentinel.current, load, IntersectionObserver, overlay.current);
  }, [started, cursor, loading, error, load]);
  return <div className="detail-overlay" ref={overlay} role="dialog" aria-modal="true" aria-label="帖子详情" tabIndex={-1}>
  <main className="main detail-main">
    <header className="detail-header">
      <button className="icon-button" onClick={onBack} title="返回推荐" aria-label="返回推荐"><ArrowLeft size={19} /></button>
      <h1>帖子</h1>
    </header>
    <Post post={post} detail />
    <div className="detail-title">评论</div>
    {replies.map((reply) => <Post key={reply.id} post={reply} detail />)}
    {loading && <div className="loading"><RefreshCw className="spin" size={17} /> 正在加载评论</div>}
    {error && <div className="detail-status"><p>{error}</p><button onClick={load}>重试</button></div>}
    {!loading && !error && started && replies.length === 0 && <div className="loading">暂无可展示的评论</div>}
    {!loading && !error && started && !cursor && replies.length > 0 && <div className="loading">暂时没有更多评论</div>}
    <div ref={sentinel} className="sentinel" />
  </main></div>;
}

function App() {
  const [settings, setSettings] = useState(() => {
    try { return { language: 'zh-CN', theme: 'system', shortcut: 'Ctrl+A', ...JSON.parse(localStorage.getItem('tw-view-settings') || '{}') }; }
    catch { return { language: 'zh-CN', theme: 'system', shortcut: 'Ctrl+A' }; }
  });
  const [persistentSettings, setPersistentSettings] = useState(null);
  const [configured, setConfigured] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [masked, setMasked] = useState(false);
  const [selection, setSelection] = useState(null);
  const selectionTranslator = useRef(null);
  if (!selectionTranslator.current) {
    selectionTranslator.current = createSelectionTranslator(translate, setSelection);
  }
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const updateSettings = (changes) => setSettings((current) => ({ ...current, ...changes }));
  const dark = settings.theme === 'system' ? systemDark : settings.theme === 'dark';
  useEffect(() => {
    axios.get('/api/preferences').then(({ data }) => {
      if (data.persistent && data.preferences) setSettings((current) => ({ ...current, ...data.preferences }));
      setPersistentSettings(Boolean(data.persistent));
    }).catch(() => setPersistentSettings(false));
  }, []);
  useEffect(() => {
    if (persistentSettings === null) return;
    if (persistentSettings) {
      axios.put('/api/preferences', settings, { headers: { 'x-tw-view': 'preferences' } }).catch(() => {});
    } else {
      localStorage.setItem('tw-view-settings', JSON.stringify(settings));
    }
  }, [settings, persistentSettings]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () => setSystemDark(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  useEffect(() => {
    const onKey = (event) => {
      if (shortcutMatches(event, settings.shortcut)) {
        event.preventDefault();
        setMasked((value) => !value);
        selectionTranslator.current.dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.shortcut]);
  useEffect(() => {
    axios.get('/api/settings').then((response) => setConfigured(response.data.configured)).catch(() => setConfigured(false));
  }, []);
  const saveCredentials = async (authToken, ct0) => {
    await axios.put('/api/settings', { authToken, ct0 }, { headers: { 'x-tw-view': 'settings' } });
    setConfigured(true);
    setStarted(false);
    setPosts([]);
    setCursor(null);
    setHasMore(true);
  };
  const selectText = (event) => {
    if (masked || !event.target.closest('.post-text, .reply-text')) return;
    const text = window.getSelection()?.toString().trim();
    if (!text || !hasForeignText(text)) { selectionTranslator.current.dismiss(); return; }
    selectionTranslator.current.start(text, settings.language, { x: event.clientX, y: event.clientY });
  };
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const busy = useRef(false);
  const sentinel = useRef(null);
  const listRef = useRef(null);
  const [listOffset, setListOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const openPost = (post) => setSelected(post);
  const backToFeed = () => setSelected(null);
  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = previousOverflow; };
  }, [selected]);
  const load = useCallback(async (reset = false) => {
    if (busy.current || (!reset && started && !hasMore)) return;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/feed', { params: reset || !cursor ? {} : { cursor } });
      setPosts((current) => mergePosts(reset ? [] : current, response.data.posts));
      setCursor(response.data.nextCursor);
      setHasMore(Boolean(response.data.nextCursor) && response.data.nextCursor !== (reset ? null : cursor));
      setStarted(true);
    } catch (failure) {
      setError(failure.response?.data?.error || '无法连接本地服务，请检查服务是否启动。');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [cursor, hasMore, started]);

  useEffect(() => { if (configured && !started) load(true); }, [configured, started]);
  useEffect(() => {
    if (selected || !started || !hasMore || error || loading) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) load();
    }, { rootMargin: '600px' });
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [load, started, hasMore, error, loading, selected]);
  useEffect(() => {
    if (!selected && listRef.current) setListOffset(listRef.current.getBoundingClientRect().top + window.scrollY);
  }, [configured, selected]);
  const virtualizer = useWindowVirtualizer({
    count: posts.length, estimateSize: () => 420, overscan: 3, scrollMargin: listOffset,
    getItemKey: (index) => posts[index].id,
  });

  return <Preferences.Provider value={settings}><ConfigProvider theme={{ algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
  <div className="layout" onMouseUp={selectText}>
    <main className="main" aria-hidden={Boolean(selected)} inert={selected ? '' : undefined}>
      <header className="header">
        <div><div className="eyebrow"><span className="status-dot" /> YOUR PERSONAL FEED</div><h1>为你推荐</h1></div>
        <button className="icon-button" onClick={() => load(true)} disabled={loading} title="刷新推荐" aria-label="刷新推荐"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button>
      </header>
      <div className="feed-top"><span>推荐动态</span><span className="feed-top-right">FOR YOU <span>✳</span></span></div>
      {configured === false && <div className="state"><strong>请先配置 X 登录信息</strong><p>打开 x.com 并登录，在浏览器开发者工具的 Application（应用）中找到 Cookies，搜索 auth_token 和 ct0，复制到设置中。</p><button onClick={() => setSettingsOpen(true)}>打开设置</button></div>}
      {configured && <div className="posts" ref={listRef} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((item) => <div key={item.key} data-index={item.index} ref={virtualizer.measureElement}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${item.start - listOffset}px)` }}>
          <Post post={posts[item.index]} onOpen={openPost} />
        </div>)}
      </div>}
      {error && <div className="state"><div className="state-icon">!</div><strong>暂时无法加载推荐</strong><p>{error}</p><button onClick={() => load(!started)}>重试</button></div>}
      {loading && <div className="loading"><RefreshCw className="spin" size={17} /> 正在加载推荐</div>}
      {!loading && !error && started && posts.length === 0 && <div className="state"><strong>暂无推荐内容</strong><p>稍后刷新再看看。</p></div>}
      {!loading && !error && started && posts.length > 0 && !hasMore && <div className="loading">暂时没有更多内容</div>}
      <div ref={sentinel} className="sentinel" />
    </main>
    {selected && <Detail key={selected.id} post={selected} onBack={backToFeed} />}
    <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="回到顶部" aria-label="回到顶部"><ArrowUp size={18} /></button>
    <button className="settings-button" onClick={() => setSettingsOpen(true)} title="设置" aria-label="设置"><SettingsIcon size={19} /></button>
    <button className="sponsor-button" onClick={() => setSponsorOpen(true)} title="赞助" aria-label="赞助"><Gift size={19} /></button>
    {selection && !masked && <div className="selection-translation" style={{ left: Math.max(10, selection.x - 80), top: Math.max(10, selection.y - 48) }}>
      <span>{selection.status === 'loading' ? '翻译中...' : selection.status === 'error' ? '翻译失败' : selection.result}</span>
      <button onClick={() => selectionTranslator.current.dismiss()} aria-label="关闭">×</button>
    </div>}
    <Settings open={settingsOpen && !masked} onClose={() => setSettingsOpen(false)} settings={settings} update={updateSettings} onSaveCredentials={saveCredentials} />
    <SponsorModal open={sponsorOpen && !masked} onClose={() => setSponsorOpen(false)} />
    {masked && <div className="privacy-mask"><button onClick={() => setMasked(false)} title="显示内容" aria-label="显示内容"><Eye size={20} /></button></div>}
  </div>
  </ConfigProvider></Preferences.Provider>;
}

installExternalLinkBridge(window, document);
createRoot(document.getElementById('root')).render(<App />);
