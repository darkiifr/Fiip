(function registerFiipContentHelpers(global) {
  function cleanClone(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('script, style, iframe, object, embed, noscript').forEach((item) => item.remove());
    clone.querySelectorAll('*').forEach((item) => {
      [...item.attributes].forEach((attr) => {
        if (attr.name.startsWith('on')) {
          item.removeAttribute(attr.name);
        }
      });
    });
    return clone;
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function collectImages(root) {
    return [...root.querySelectorAll('img')]
      .map((image) => image.currentSrc || image.src)
      .filter(Boolean)
      .filter((src) => /^https?:\/\//i.test(src))
      .slice(0, 12);
  }

  function buildClipPayload({ document, location, selectionText = '', captureMode = 'readable', now = () => new Date() }) {
    const article = document.querySelector('article, main') || document.body;
    const clone = cleanClone(article);
    const title = document.title || 'Capture web';
    const selectedText = captureMode === 'selection' ? selectionText.trim() : '';

    return {
      title,
      url: location.href,
      selectionText: selectedText,
      html: selectedText ? `<blockquote>${escapeHtml(selectedText)}</blockquote>` : clone.innerHTML,
      images: collectImages(article),
      capturedAt: now().toISOString(),
    };
  }

  global.FiipContentHelpers = {
    buildClipPayload,
    cleanClone,
    collectImages,
    escapeHtml,
  };
})(globalThis);
