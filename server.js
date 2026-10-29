
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, "uploads");
const dataDir = path.join(__dirname, "data");
const songsFile = path.join(dataDir, "songs.json");

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(songsFile)) {
  fs.writeFileSync(songsFile, "[]", "utf8");
}

function readSongs() {
  try {
    const data = JSON.parse(fs.readFileSync(songsFile, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveSongs(songs) {
  fs.writeFileSync(songsFile, JSON.stringify(songs, null, 2), "utf8");
}

const allowedExtensions = new Set([
  ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(ext)) return cb(null, true);
    cb(new Error("فرمت فایل پشتیبانی نمی‌شود."));
  }
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function safeText(value, maxLength = 100) {
  return String(value || "").trim().slice(0, maxLength);
}

function findSong(id) {
  return readSongs().find(song => song.id === id);
}

app.get("/", (req, res) => {
  const songs = readSongs();

  const songCards = songs.map(song => `
    <article class="song card"
      data-title="${escapeHtml(song.title)}"
      data-artist="${escapeHtml(song.artist)}">
      <h3>${escapeHtml(song.title)}</h3>
      <p>خواننده: ${escapeHtml(song.artist || "نامشخص")}</p>
      <audio controls preload="none" src="/stream/${encodeURIComponent(song.id)}"></audio>
      <a class="download" href="/download/${encodeURIComponent(song.id)}">⬇ دانلود آهنگ</a>
    </article>
  `).join("");

  res.send(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>موزیک | پخش و دانلود آهنگ</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#10121b;color:#f5f5f5;font-family:Tahoma,Arial,sans-serif}
header{text-align:center;padding:30px 15px;background:linear-gradient(135deg,#6d28d9,#db2777)}
header h1{margin:0 0 10px;font-size:32px}
main{width:min(900px,92%);margin:25px auto}
.card{background:#1d2030;padding:18px;border-radius:14px;margin:15px 0}
input,button{font:inherit;padding:12px;border-radius:8px;border:0}
input{width:100%;margin:8px 0;background:#fff;color:#111}
button{background:#9333ea;color:white;cursor:pointer}
.song h3{margin-top:0}
audio{display:block;width:100%;margin:14px 0}
.download{display:inline-block;background:#059669;color:white;padding:10px 14px;border-radius:8px;text-decoration:none}
small,.muted{color:#c5c7d2}
#message{white-space:pre-wrap}
footer{text-align:center;padding:25px;color:#c5c7d2}
</style>
</head>
<body>
<header>
<h1>🎵 موزیک</h1>
<p>آهنگ‌های مورد علاقه‌ات را پیدا کن و گوش بده</p>
</header>

<main>
<section class="card">
<h2>🔎 جست‌وجوی آهنگ</h2>
<input id="search" type="search"
placeholder="نام آهنگ یا خواننده را بنویس..."
autocomplete="off">
<p id="count" class="muted"></p>
</section>

<section>
<h2>🎶 فهرست آهنگ‌ها</h2>
<div id="songList">
${songCards || '<div class="card">هنوز آهنگی اضافه نشده است.</div>'}
</div>
<p id="empty" hidden>آهنگی با این نام پیدا نشد.</p>
</section>

<section class="card">
<h2>🔐 پنل آپلود مدیر</h2>
<p class="muted">فقط مدیر با رمز صحیح می‌تواند آهنگ اضافه کند.</p>
<form id="uploadForm" enctype="multipart/form-data">
<input name="password" type="password" placeholder="رمز مدیر" required>
<input name="title" type="text" placeholder="نام آهنگ" maxlength="100" required>
<input name="artist" type="text" placeholder="نام خواننده" maxlength="100">
<label for="audioFile">انتخاب فایل آهنگ (حداکثر ۵۰ مگابایت)</label>
<input id="audioFile" name="audio" type="file"
accept=".mp3,.wav,.ogg,.m4a,.aac,.flac" required>
<button type="submit">آپلود آهنگ</button>
</form>
<p id="message"></p>
</section>
</main>

<footer>موزیک 🎧</footer>

<script>
const searchInput = document.getElementById("search");
const songCards = [...document.querySelectorAll(".song")];
const count = document.getElementById("count");
const empty = document.getElementById("empty");

function searchSongs() {
  const query = searchInput.value.trim().toLocaleLowerCase("fa");
  let visible = 0;

  songCards.forEach(card => {
    const title = (card.dataset.title || "").toLocaleLowerCase("fa");
    const artist = (card.dataset.artist || "").toLocaleLowerCase("fa");
    const match = title.includes(query) || artist.includes(query);

    card.hidden = !match;
    if (match) visible++;
  });

  count.textContent = "تعداد آهنگ‌های نمایش‌داده‌شده: " + visible;
  empty.hidden = visible !== 0;
}

searchInput.addEventListener("input", searchSongs);
searchSongs();

document.getElementById("uploadForm").addEventListener("submit", async event => {
  event.preventDefault();

  const message = document.getElementById("message");
  const form = event.currentTarget;
  const button = form.querySelector("button");

  message.textContent = "در حال آپلود...";
  button.disabled = true;

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: new FormData(form)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "آپلود ناموفق بود.");
    }

    message.textContent = "آهنگ اضافه شد. صفحه در حال تازه‌سازی است...";
    window.location.reload();
  } catch (error) {
    message.textContent = error.message || "خطا در اتصال به سرور.";
  } finally {
    button.disabled = false;
  }
});
</script>
</body>
</html>`);
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

app.get("/api/songs", (req, res) => {
  res.json(readSongs().map(({ id, title, artist }) => ({
    id, title, artist
  })));
});

app.post("/api/upload", (req, res) => {
  upload.single("audio")(req, res, err => {
    if (err) {
      const status = err instanceof multer.MulterError ? 400 : 400;
      return res.status(status).json({ error: err.message });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    const suppliedPassword = req.body.password;

    if (!adminPassword) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(503).json({
        error: "رمز مدیر در تنظیمات سرور تعریف نشده است."
      });
    }

    const correct = typeof suppliedPassword === "string" &&
      suppliedPassword.length === adminPassword.length &&
      crypto.timingSafeEqual(
        Buffer.from(suppliedPassword),
        Buffer.from(adminPassword)
      );

    if (!correct) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(401).json({ error: "رمز مدیر اشتباه است." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "فایل آهنگ انتخاب نشده است." });
    }

    const title = safeText(req.body.title);
    const artist = safeText(req.body.artist);

    if (!title) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "نام آهنگ را وارد کن." });
    }

    const songs = readSongs();
    const song = {
      id: crypto.randomUUID(),
      title,
      artist,
      filename: req.file.filename
    };

    songs.unshift(song);

    try {
      saveSongs(songs);
      return res.status(201).json({
        message: "آهنگ با موفقیت اضافه شد.",
        song: { id: song.id, title: song.title, artist: song.artist }
      });
    } catch {
      fs.unlink(req.file.path, () => {});
      return res.status(500).json({ error: "ذخیره اطلاعات آهنگ ناموفق بود." });
    }
  });
});

app.get("/stream/:id", (req, res) => {
  const song = findSong(req.params.id);
  if (!song) return res.status(404).send("آهنگ پیدا نشد.");

  const filePath = path.join(uploadsDir, path.basename(song.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("فایل آهنگ در دسترس نیست.");
  }

  res.type(path.extname(filePath));
  res.sendFile(filePath);
});

app.get("/download/:id", (req, res) => {
  const song = findSong(req.params.id);
  if (!song) return res.status(404).send("آهنگ پیدا نشد.");

  const filePath = path.join(uploadsDir, path.basename(song.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("فایل آهنگ در دسترس نیست.");
  }

  const ext = path.extname(filePath);
  const downloadName = safeText(song.title, 100) + ext;
  res.download(filePath, downloadName);
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).send("خطای داخلی سرور.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Music site running on port " + PORT);
});
