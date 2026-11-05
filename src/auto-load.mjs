export function observeMore(target, load, Observer = IntersectionObserver, root = null) {
  if (!target) return () => {};
  const observer = new Observer((entries) => {
    if (entries[0]?.isIntersecting) load();
  }, { root, rootMargin: '600px' });
  observer.observe(target);
  return () => observer.disconnect();
}
