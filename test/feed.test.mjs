import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeline, mergePosts, parseReplies, parseReplyPage } from '../server/feed.mjs';

test('extracts posts and bottom cursor', () => {
  const result = parseTimeline({ data: { home: { instructions: [{ entries: [
    { entryId: 'tweet-1', content: { itemContent: { tweet_results: { result: { rest_id: '1', legacy: { full_text: 'Hello' }, core: { user_results: { result: { legacy: { name: 'Alice', screen_name: 'alice' } } } } } } } } },
    { entryId: 'cursor-bottom-1', content: { cursorType: 'Bottom', value: 'next' } },
  ] }] } } });
  assert.equal(result.posts[0].text, 'Hello');
  assert.equal(result.posts[0].author.handle, 'alice');
  assert.equal(result.nextCursor, 'next');
});

test('deduplicates posts while preserving order', () => {
  assert.deepEqual(mergePosts([{ id: '1' }], [{ id: '1' }, { id: '2' }]), [{ id: '1' }, { id: '2' }]);
});

test('ignores unavailable posts', () => {
  assert.deepEqual(parseTimeline({ data: {} }), { posts: [], nextCursor: null });
});

test('returns at most three unique direct replies in timeline order', () => {
  const item = (id, parent) => ({ tweet_results: { result: {
    rest_id: id,
    legacy: { full_text: `reply ${id}`, in_reply_to_status_id_str: parent },
    core: { user_results: { result: { legacy: { name: 'Alice', screen_name: 'alice' } } } },
  } } });
  const response = { entries: [
    item('10', null), item('11', '10'), item('12', '11'), item('11', '10'),
    item('13', '10'), item('14', '10'), item('15', '10'),
  ] };
  assert.deepEqual(parseReplies(response, '10').map((reply) => reply.id), ['11', '13', '14']);
});

test('returns an empty list for missing replies', () => {
  assert.deepEqual(parseReplies({}, '10'), []);
});

test('detail page returns all direct replies and its continuation cursor', () => {
  const item = (id, parent) => ({ tweet_results: { result: {
    rest_id: id,
    legacy: { full_text: `reply ${id}`, in_reply_to_status_id_str: parent },
    core: { user_results: { result: { legacy: { name: 'Alice', screen_name: 'alice' } } } },
  } } });
  const page = parseReplyPage({ entries: [
    item('11', '10'), item('12', '10'), item('13', '10'), item('14', '10'),
    item('15', '11'), { cursorType: 'Bottom', value: 'next' },
  ] }, '10');
  assert.deepEqual(page.replies.map((reply) => reply.id), ['11', '12', '13', '14']);
  assert.equal(page.nextCursor, 'next');
});

test('retains HLS video variants when MP4 is unavailable', () => {
  const response = { tweet_results: { result: {
    rest_id: '1',
    legacy: { extended_entities: { media: [{ type: 'video', video_info: { variants: [
      { content_type: 'application/x-mpegURL', url: 'https://video.twimg.com/video.m3u8' },
    ] } }] } },
    core: { user_results: { result: { legacy: { name: 'Alice', screen_name: 'alice' } } } },
  } } };
  assert.equal(parseTimeline(response).posts[0].media[0].video, 'https://video.twimg.com/video.m3u8');
});
