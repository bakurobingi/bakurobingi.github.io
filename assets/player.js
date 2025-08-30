// ========= 配置：你的 COS 音乐链接（至少填一首） =========
const TRACKS = [ 'https://baku-1308169645.cos.ap-beijing.myqcloud.com/bgm/Ideal%20and%20the%20Real%20MP3%20-%20Persona%205%20Royal%20Original%20Soundtrack%20%282022%29%20OST%20-%20Download%20Persona%205%20Royal%20Original%20Soundtrack%20%282022%29%20Soundtracks%20for%20FREE%21.mp3', 'https://baku-1308169645.cos.ap-beijing.myqcloud.com/bgm/Ideal%20and%20the%20Real%20MP3%20-%20Persona%205%20Royal%20Original%20Soundtrack%20%282022%29%20OST%20-%20Download%20Persona%205%20Royal%20Original%20Soundtrack%20%282022%29%20Soundtracks%20for%20FREE%21.mp3','https://baku-1308169645.cos.ap-beijing.myqcloud.com/bgm/hitomi%20-%20MAP%E7%8F%A0%E9%96%92%E7%91%A0%E5%B8%82.mp3','https://baku-1308169645.cos.ap-beijing.myqcloud.com/bgm/%E5%9C%9F%E5%B1%8B%E6%86%B2%E4%B8%80%20-%20%E8%88%9E%E8%80%B6%20%28%E3%83%86%E3%83%BC%E3%83%9E2%29.mp3',
  // 示例：'https://your-cos-domain.com/music/bgm1.mp3',
  //       'https://your-cos-domain.com/music/bgm2.mp3',
];
// =========================================================

(function () {
  if (!window.localStorage) return;

  // 没填曲目就不渲染
  if (!TRACKS.length) {
    console.warn("[player] 未配置 TRACKS，播放器不会显示");
    return;
  }

  // 容器
  const root = document.createElement("div");
  root.id = "player-root";
  root.innerHTML = `
    <div class="player-box">
      <button class="player-btn" id="p-toggle" aria-label="播放/暂停"><span class="player-icon">🎵</span></button>
      <div class="player-title" id="p-title">BGM</div>
      <div class="player-vol">
        <span class="player-icon">🔊</span>
        <input type="range" id="p-vol" min="0" max="1" step="0.01">
      </div>
    </div>
  `;
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(root));

  // 音频
  const audio = new Audio();
  audio.preload = "auto";
  audio.loop = false; // 用播放列表循环
  let idx = 0;

  // 读写状态
  const KEY = "bgm-state-v1";
  const loadState = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  };
  const saveState = (s) => localStorage.setItem(KEY, JSON.stringify(s));

  const state = Object.assign({ idx: 0, time: 0, vol: 0.7, playing: false }, loadState());

  // 绑定元素（等插入后再绑定）
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("p-toggle");
    const vol = document.getElementById("p-vol");
    const title = document.getElementById("p-title");

    function setTrack(i) {
      idx = (i + TRACKS.length) % TRACKS.length;
      audio.src = TRACKS[idx];
      title.textContent = decodeURIComponent(TRACKS[idx].split("/").pop() || `Track ${idx + 1}`);
    }

    // 初始化
    audio.volume = state.vol;
    vol.value = String(state.vol);
    setTrack(state.idx || 0);
    if (state.time) audio.currentTime = state.time;

    const setBtn = (p) => btn.innerHTML = `<span class="player-icon">${p ? "⏸️" : "▶️"}</span>`;
    setBtn(state.playing);

    btn.addEventListener("click", async () => {
      if (audio.paused) {
        try {
          await audio.play(); // 移动端首次需要用户点击
          setBtn(true);
          state.playing = true;
          saveState(state);
        } catch (e) {
          console.log("播放被阻止：", e);
        }
      } else {
        audio.pause();
        setBtn(false);
        state.playing = false;
        saveState(state);
      }
    });

    vol.addEventListener("input", () => {
      audio.volume = Number(vol.value);
      state.vol = audio.volume;
      saveState(state);
    });

    // 进度节流保存
    let lastSave = 0;
    audio.addEventListener("timeupdate", () => {
      const now = Date.now();
      if (now - lastSave > 1000) {
        state.time = audio.currentTime;
        state.idx = idx;
        saveState(state);
        lastSave = now;
      }
    });

    audio.addEventListener("ended", () => {
      state.time = 0;
      setTrack(idx + 1);
      audio.currentTime = 0;
      if (state.playing) audio.play().catch(() => {});
      saveState(state);
    });

    // 恢复播放（可能被策略拦截）
    if (state.playing) {
      audio.play().then(() => setBtn(true)).catch(() => {
        setBtn(false);
        state.playing = false;
        saveState(state);
      });
    }

    window.addEventListener("beforeunload", () => {
      state.time = audio.currentTime;
      state.idx = idx;
      saveState(state);
    });
  });
})();
