import React, { useEffect, useState } from 'react';
import { Modal, Tabs } from 'antd';
import axios from 'axios';
import { normalizeSponsors, sponsorChannels } from './sponsors.mjs';

function SponsorList({ url }) {
  const [state, setState] = useState({ loading: true, sponsors: [], error: false });
  useEffect(() => {
    let active = true;
    axios.get(url, { timeout: 10000 }).then(({ data }) => {
      if (active) setState({ loading: false, sponsors: normalizeSponsors(data), error: false });
    }).catch(() => {
      if (active) setState({ loading: false, sponsors: [], error: true });
    });
    return () => { active = false; };
  }, [url]);
  return <div className="sponsor-ranking">
    {state.loading && <p>正在加载赞助用户...</p>}
    {state.error && <p>赞助用户暂时无法加载，请稍后再试。</p>}
    {!state.loading && !state.error && state.sponsors.length === 0 && <p>暂无公开的赞助记录。</p>}
    {state.sponsors.length > 0 && <ul>{state.sponsors.map((sponsor, index) => <li key={`${index}-${sponsor.name}`}>
      {sponsor.avatar ? <img src={sponsor.avatar} alt="" referrerPolicy="no-referrer" />
        : <span className="sponsor-avatar">{Array.from(sponsor.name)[0]}</span>}
      <span className="sponsor-name">{sponsor.name}</span>
    </li>)}</ul>}
    <p>昵称和头像不得包含敏感或不适宜内容，违规信息可能被下架。</p>
  </div>;
}

export function SponsorRanking() {
  return <Tabs items={sponsorChannels.map((channel) => ({
    key: channel.key,
    label: channel.label,
    children: <SponsorList url={channel.url} />,
  }))} />;
}

export function SponsorModal({ open, onClose }) {
  return <Modal title="赞助 X-Lens" open={open} onCancel={onClose} footer={null} destroyOnClose>
    <div className="sponsor-modal">
      <p>感谢支持 X-Lens 的维护与开发。</p>
      <div className="sponsor-links">
        <a className="sponsor-link" href="https://afdian.com/a/honshenai/" target="_blank" rel="noreferrer">爱发电</a>
        <a className="sponsor-link" href="https://ko-fi.com/honshen" target="_blank" rel="noreferrer">Ko-fi</a>
      </div>
      <h3>赞助用户</h3>
      <SponsorRanking />
    </div>
  </Modal>;
}
