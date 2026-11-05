# X-Lens

A focused reading view for your X recommendation feed, embedded in VS Code.

X-Lens provides a compact, single-column view for browsing posts, media, and replies while you work. It is an independent project and is not affiliated with or endorsed by X.

## Features

- Browse the recommendation feed and load more as you scroll.
- Open a post to read additional replies.
- Preview images and play supported videos.
- Translate a post or selected text into a configured language.
- Switch between light and dark themes, or follow your system setting.
- Hide and reveal the page using a configurable shortcut.
- Support development via [Afdian](https://afdian.com/a/honshenai/) or [Ko-fi](https://ko-fi.com/honshen/) and view the public supporter list.

## Setup

The extension includes the reader and starts its local service on an available
loopback port. No separate application or Node.js installation is required.

1. Select the X-Lens icon in the activity bar, or run **X-Lens: Open** from the command palette. Drag the sidebar edge to adjust its width.
2. In the reader's settings, enter your own X `auth_token` and `ct0` cookies.

## Privacy and limitations

- X login cookies are saved as plaintext in a `.env` file in VS Code's extension data directory. Protect that file and never share it.
- Selecting foreign text automatically sends that text to Google Translate; if unavailable, the application uses MyMemory. Post translation also sends the post text to a translation provider.
- The companion application uses X's unofficial web endpoints. Access, pagination, or media playback can stop working if X changes its interface, expires a session, or limits requests.
- Remote development environments have not been validated.

## License

X-Lens may be used but not modified or redistributed without permission. See
`LICENSE` and `THIRD_PARTY_NOTICES.txt` for the applicable terms.
