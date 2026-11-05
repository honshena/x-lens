export function createSelectionTranslator(translate, setState) {
  let requestId = 0;
  return {
    async start(text, language, position) {
      const currentId = ++requestId;
      setState({ text, ...position, status: 'loading' });
      try {
        const result = await translate(text, language);
        if (requestId === currentId) setState({ text, ...position, status: 'done', result });
      } catch {
        if (requestId === currentId) setState({ text, ...position, status: 'error' });
      }
    },
    dismiss() {
      requestId += 1;
      setState(null);
    },
  };
}
