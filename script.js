// ===== 自动加载日记导航 =====
function loadDiaryList() {
  fetch("assets/diaryList.json")
    .then(res => res.json())
    .then(data => {
      const nav = document.getElementById("diary-list");
      nav.innerHTML = ""; // 清空

      for (const [title, file] of Object.entries(data)) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#";
        a.textContent = title;
        a.onclick = () => loadDiary(file);
        li.appendChild(a);
        nav.appendChild(li);
      }
    });
}

// ===== 加载日记内容 =====
function loadDiary(filename) {
  const content = document.getElementById("diary-content");
  const url = `assets/diary/${filename}`;

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("not found");
      return res.text();
    })
    .then(data => {
      content.innerHTML = data;
    })
    .catch(() => {
      content.innerHTML = "<p>暂无内容。</p>";
    });
}

// ===== 画廊预览（原有功能） =====
function openImage(src) {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  lightboxImg.src = src;
  lightbox.style.display = "flex";
}
function closeImage() {
  document.getElementById("lightbox").style.display = "none";
}

// ===== 页面加载时执行 =====
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("diary-list")) {
    loadDiaryList();
  }
});
