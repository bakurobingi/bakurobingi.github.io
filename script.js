// ===== 画廊：从 JSON 渲染缩略图 =====
function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  fetch("assets/galleryList.json")
    .then(res => res.json())
    .then(items => {
      grid.innerHTML = ""; // 清空
      items.forEach(item => {
        const img = document.createElement("img");
        img.src = item.thumb;         // 本地小图
        img.alt = item.title || "";
        img.loading = "lazy";         // 懒加载提升性能
        img.onclick = () => openImage(item.full); // 图床大图
        grid.appendChild(img);
      });
    })
    .catch(err => {
      console.error("加载画廊失败:", err);
      const tip = document.createElement("p");
      tip.textContent = "画廊加载失败，请稍后重试。";
      grid.appendChild(tip);
    });
}

// ===== Lightbox 预览 =====
function openImage(src) {
  const box = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  box.style.display = "flex";
}
function closeImage() {
  const box = document.getElementById("lightbox");
  box.style.display = "none";
  document.getElementById("lightbox-img").src = "";
}

// ===== 日记（如果你已经有自动导航，这里保留） =====
function loadDiaryList() {
  const el = document.getElementById("diary-list");
  if (!el) return;
  fetch("assets/diaryList.json")
    .then(res => res.json())
    .then(data => {
      el.innerHTML = "";
      for (const [title, file] of Object.entries(data)) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#";
        a.textContent = title;
        a.onclick = () => loadDiary(file);
        li.appendChild(a);
        el.appendChild(li);
      }
    });
}
function loadDiary(filename) {
  const content = document.getElementById("diary-content");
  if (!content) return;
  fetch(`assets/diary/${filename}`)
    .then(res => {
      if (!res.ok) throw new Error("not found");
      return res.text();
    })
    .then(html => content.innerHTML = html)
    .catch(() => content.innerHTML = "<p>暂无内容。</p>");
}

// ===== 页面加载触发 =====
document.addEventListener("DOMContentLoaded", () => {
  renderGallery();   // 画廊页会执行；非画廊页 grid 不存在就直接返回
  loadDiaryList();   // 日记页会执行；非日记页列表不存在就直接返回
});
