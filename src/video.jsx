import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export function Video({ src, poster }) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return undefined;
    if (/\.m3u8(?:\?|$)/i.test(src) && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
    video.src = src.startsWith('https://video.twimg.com/')
      ? `/api/video?url=${encodeURIComponent(src)}` : src;
    return undefined;
  }, [src]);
  return <video ref={ref} controls playsInline preload="none" poster={poster} />;
}
