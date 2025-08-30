<script>
// ========= 配置：你的 COS 音乐链接 =========
const TRACKS = ['https://baku-1308169645.cos.ap-beijing.myqcloud.com/bgm/hitomi%20-%20MAP%E7%8F%A0%E9%96%92%E7%91%A0%E5%B8%82.mp3','https://baku-1308169645.cos.ap-beijing.myqcloud.com/bgm/%E5%9C%9F%E5%B1%8B%E6%86%B2%E4%B8%80%20-%20%E8%88%9E%E8%80%B6%20%28%E3%83%86%E3%83%BC%E3%83%9E2%29.mp3',

  // 示例：'https://你的COS域名/path/to/music1.mp3',
  //       'https://你的COS域名/path/to/music2.mp3',
];
// ==========================================
(function(){
  if (!window.localStorage) return;

  // DOM 容器
  const root = document.createElement('div');
  root.id = 'player-root';
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
  document.body.appendChild(root);

  // 音频
  const audio = new Audio();
  audio.preload = 'auto';
  audio.loop = false; // 用播放列表循环
  let idx = 0;

  // 读写状态
  const KEY = 'bgm-state-v1';
  const loadState = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  };
  const saveState = (s) => {
    localStorage.setItem(KEY, JSON.stringify(s));
  };

  // 初始状态
  const state = Object.assign({
    idx: 0, time: 0, vol: 0.7, playing: false, title: ''
  }, loadState());

  // 若没配置曲目则隐藏控件
  if (!TRACKS.length) {
    document.getElementById('p-title').textContent = '未配置BGM';
    return;
  }

  // 绑定元素
  const btn = document.getElementById('p-toggle');
  const vol = document.getElementById('p-vol');
  const title = document.getElementById('p-title');

  // 初始化音量
  audio.volume = state.vol;
  vol.value = String(state.vol);

  // 设置曲目
  function setTrack(i){
    idx = (i + TRACKS.length) % TRACKS.length;
    audio.src = TRACKS[idx];
    title.textContent = decodeURIComponent(TRACKS[idx].split('/').pop() || `Track ${idx+1}`);
  }

  // 恢复曲目与进度
  setTrack(state.idx || 0);
  audio.currentTime = state.time || 0;

  // UI 同步
  function setBtnPlaying(p){
    btn.innerHTML = `<span class="player-icon">${p ? '⏸️' : '▶️'}</span>`;
  }
  setBtnPlaying(state.playing);

  // 事件
  btn.addEventListener('click', async ()=>{
    if (audio.paused) {
      try {
        await audio.play(); // 需要用户点击后才不会被拦截
        setBtnPlaying(true);
        state.playing = true;
        saveState(state);
      } catch(e) {
        console.log('播放被阻止：', e);
      }
    } else {
      audio.pause();
      setBtnPlaying(false);
      state.playing = false;
      saveState(state);
    }
  });

  vol.addEventListener('input', ()=>{
    audio.volume = Number(vol.value);
    state.vol = audio.volume;
    saveState(state);
  });

  // 进度持久化（节流）
  let lastSave = 0;
  audio.addEventListener('timeupdate', ()=>{
    const now = Date.now();
    if (now - lastSave > 1000) { // 每秒存一次
      state.time = audio.currentTime;
      state.idx  = idx;
      state.title = title.textContent;
      saveState(state);
      lastSave = now;
    }
  });

  audio.addEventListener('ended', ()=>{
    // 下一首
    state.time = 0;
    setTrack(idx + 1);
    audio.currentTime = 0;
    if (state.playing) audio.play().catch(()=>{});
    saveState(state);
  });

  // 若上次是播放中，尝试自动恢复（部分浏览器需要再次点击）
  if (state.playing) {
    audio.play().then(()=>{
      setBtnPlaying(true);
    }).catch(()=>{
      // 被策略拦截，等待用户点一次按钮
      setBtnPlaying(false);
      state.playing = false;
      saveState(state);
    });
  }

  // 离开前保存
  window.addEventListener('beforeunload', ()=>{
    state.time = audio.currentTime;
    state.idx  = idx;
    saveState(state);
  });
})();
</script>
