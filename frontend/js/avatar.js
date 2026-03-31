/**
 * Creates a styled avatar <div> for an account.
 * @param {object} acc  - account object with .avatar, .color, .avatar_filter, .name
 * @param {number} size - diameter in px (default 40)
 */
function makeAvatarEl(acc, size = 40) {
  const el = document.createElement('div');
  el.className = 'avatar';
  el.style.width  = size + 'px';
  el.style.height = size + 'px';
  el.style.borderRadius = '50%';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.flexShrink = '0';
  el.style.background = acc.color || '#5b6af5';
  el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.18)';

  if (acc.avatar) {
    const fontSize = Math.round(size * 0.58);
    el.style.fontSize = fontSize + 'px';
    el.style.lineHeight = '1';

    if (acc.avatar_filter) {
      // Wrap emoji in a span so the filter doesn't tint the background circle
      const span = document.createElement('span');
      span.textContent = acc.avatar;
      span.style.filter = acc.avatar_filter;
      span.style.display = 'block';
      el.appendChild(span);
    } else {
      el.textContent = acc.avatar;
    }
  } else {
    el.style.fontSize = Math.round(size * 0.45) + 'px';
    el.style.fontWeight = '800';
    el.style.color = '#fff';
    el.textContent = acc.name[0].toUpperCase();
  }

  return el;
}
