const getPlaceholderImage = (width = 400, height = 225, text = '') => {
  const encoded = encodeURIComponent(text || `${width}x${height}`);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect fill='%23374151' width='${width}' height='${height}'/%3E%3Ctext fill='%239ca3af' font-family='system-ui,sans-serif' font-size='${Math.min(width, height) * 0.07}' x='${width / 2}' y='${height / 2}' text-anchor='middle' dominant-baseline='middle'%3E${encoded}%3C/text%3E%3C/svg%3E`;
};

export default getPlaceholderImage;
