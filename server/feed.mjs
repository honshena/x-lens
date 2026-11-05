export function mergePosts(existing, incoming) {
  const seen = new Set(existing.map((post) => post.id));
  return existing.concat(incoming.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  }));
}

export function parseTimeline(data) {
  const posts = [];
  let nextCursor = null;
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.cursorType === 'Bottom' && value.value) nextCursor = value.value;
    if (value.tweet_results?.result) {
      let tweet = value.tweet_results.result;
      if (tweet.tweet) tweet = tweet.tweet;
      const legacy = tweet.legacy;
      const user = tweet.core?.user_results?.result;
      const profile = user?.legacy || {};
      const core = user?.core || {};
      if (tweet.rest_id && legacy && user) {
        const media = (legacy.extended_entities?.media || []).map((item) => ({
          type: item.type,
          url: item.media_url_https,
          video: item.video_info?.variants?.filter((variant) => variant.content_type === 'video/mp4')
            .sort((first, second) => (second.bitrate || 0) - (first.bitrate || 0))[0]?.url
            || item.video_info?.variants?.find((variant) => variant.content_type?.toLowerCase() === 'application/x-mpegurl')?.url,
        }));
        posts.push({
          id: tweet.rest_id,
          parentId: legacy.in_reply_to_status_id_str || null,
          text: tweet.note_tweet?.note_tweet_results?.result?.text || legacy.full_text || '',
          createdAt: legacy.created_at,
          author: {
            name: core.name || profile.name || '',
            handle: core.screen_name || profile.screen_name || '',
            avatar: user.avatar?.image_url || profile.profile_image_url_https || '',
            verified: Boolean(user.is_blue_verified || user.verification?.verified || profile.verified),
          },
          media,
          likes: legacy.favorite_count || 0,
          replies: legacy.reply_count || 0,
          reposts: legacy.retweet_count || 0,
          views: tweet.views?.count || 0,
        });
      }
      return;
    }
    Object.values(value).forEach(visit);
  }
  visit(data);
  return { posts: mergePosts([], posts), nextCursor };
}

export function parseReplies(data, postId) {
  return parseTimeline(data).posts.filter((post) => post.parentId === postId).slice(0, 3);
}

export function parseReplyPage(data, postId) {
  const timeline = parseTimeline(data);
  return {
    replies: timeline.posts.filter((post) => post.parentId === postId),
    nextCursor: timeline.nextCursor,
  };
}
