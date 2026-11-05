import React, { useState } from 'react';
import { Modal, Select, Input, Button, Segmented } from 'antd';
import { SponsorRanking } from './sponsor.jsx';

export const languages = [
  ['zh-CN', '简体中文'], ['en', '英语'], ['ja', '日语'], ['ko', '韩语'],
  ['fr', '法语'], ['de', '德语'], ['es', '西班牙语'],
];

export function Settings({ open, onClose, settings, update, onSaveCredentials }) {
  const [authToken, setAuthToken] = useState('');
  const [ct0, setCt0] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSaveCredentials(authToken.trim(), ct0.trim());
      setAuthToken('');
      setCt0('');
      onClose();
    } catch (failure) {
      setError(failure.response?.data?.error || '保存失败，请检查本地服务。');
    } finally { setSaving(false); }
  };
  return <Modal title="设置" open={open} onCancel={onClose} footer={null} destroyOnClose>
    <div className="settings-form">
      <label>翻译语言</label>
      <Select value={settings.language} onChange={(language) => update({ language })}
        options={languages.map(([value, label]) => ({ value, label }))} />
      <p>选择帖子或评论中的外文后会自动翻译，文字将发送至 Google 翻译，失败时使用 MyMemory 翻译服务。</p>
      <label>主题</label>
      <Segmented block value={settings.theme} onChange={(theme) => update({ theme })}
        options={[{ label: '跟随系统', value: 'system' }, { label: '深色', value: 'dark' }, { label: '浅色', value: 'light' }]} />
      <label>隐藏内容快捷键</label>
      <Input readOnly value={settings.shortcut} onKeyDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return;
        const parts = [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Meta', event.key.toUpperCase()].filter(Boolean);
        if (parts.length > 1) update({ shortcut: parts.join('+') });
      }} />
      <label>X 认证配置</label>
      <p>在 X 登录后，打开浏览器开发者工具的 Application（应用）面板，在 Cookies 中找到 x.com，搜索并复制以下两项。</p>
      <Input.Password placeholder="auth_token" value={authToken} onChange={(event) => setAuthToken(event.target.value)} autoComplete="off" />
      <Input.Password placeholder="ct0" value={ct0} onChange={(event) => setCt0(event.target.value)} autoComplete="off" />
      {error && <p className="settings-error">{error}</p>}
      <Button type="primary" loading={saving} onClick={save}>保存认证配置</Button>
      <label>赞助用户</label>
      {open && <SponsorRanking />}
    </div>
  </Modal>;
}
