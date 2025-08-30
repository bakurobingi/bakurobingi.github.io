// 打字机（index 专用）
document.addEventListener("DOMContentLoaded", () => {
  const textEl = document.getElementById("welcome-text");
  const line = document.getElementById("welcome-line");
  if (!textEl || !line) return; // 没有容器就不跑（只在首页）

  const TEXT = "welcome~ 这里是我屯日记与涂鸦的小站";
  const SPEED = 45;   // 每字毫秒
  const DELAY = 300;  // 开始延时

  // 如果系统开启“减少动效”，直接显示全文
  const reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { textEl.textContent = TEXT; return; }

  let i = 0;
  setTimeout(function tick() {
    textEl.textContent = TEXT.slice(0, i++);
    if (i <= TEXT.length) setTimeout(tick, SPEED);
  }, DELAY);
});
