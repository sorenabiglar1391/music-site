
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const songsDir = path.join(__dirname, "songs");
const dataFile = path.join(__dirname, "songs.json");

fs.mkdirSync(songsDir, { recursive: true });
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, "[]");
}

const upload = multer({
  dest: songsDir,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.originalname));
  }
});

const getSongs = () => JSON.parse(fs.readFileSync(dataFile, "utf8"));

const escapeHtml = value => String(value).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
);

app.get("/", (req, res) => {
  const songs = getSongs();

  res.send(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>موزیک</title>
<style>
body{background:#101018;color:white;font-family:Tahoma,Arial;margin:0}
header{text-align:center;background:#202033;padding:25px}
h1{color:#a7f36a}
main{max-width:750px;margin:25px auto;padding:12px}
.card{background:#202033;border-radius:14px;padding:18px;margin:15px 0}
input,button{padding:12px;margin:5px 0;max-width:100%;border-radius:8px}
button{background:#a7f36a;border:0;cursor:pointer}
audio{width:100%;margin:12px 0}
a{color:#a7f36a}
</style>
</head>
<body>
<header><h1>🎵 موزیک</h1><p>آهنگ گوش کن و دانلود کن</p></header>
<main>
<section class="card"><h2>آهنگ‌ها</h2>
${songs.map(s => `<div class="card">
<strong>${escapeHtml(s.title)}</strong>
<audio controls preload="none" src="/audio/${encodeURIComponent(s.id)}"></audio>
<a href="/download/${encodeURIComponent(s.id)}">دانلود آهنگ</a>
</div>`).join("") || "<p>هنوز آهنگی اضافه نشده است.</p>"}
</section>
<section class="card"><h2>پنل مدیر</h2>
<form action="/upload" method="post" enctype="multipart/form-data">
<input type="password" name="password" placeholder="رمز مدیر" required><br>
<input name="title" placeholder="نام آهنگ" required><br>
<input type="file" name="song" accept=".mp3,.wav,.ogg,.m4a,.aac,.flac" required><br>
<button type="submit">بارگذاری آهنگ</button>
</form>
</section>
</main>
</body></html>`);
});

app.post("/upload", upload.single("song"), (req, res) => {
  if (!ADMIN_PASSWORD || req.body.password !== ADMIN_PASSWORD) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(401).send("رمز مدیر درست نیست یا تنظیم نشده است.");
  }

  if (!req.file) return res.status(400).send("فایل صوتی انتخاب نشده است.");

  const songs = getSongs();
  songs.unshift({
    id: req.file.filename,
    title: String(req.body.title || "آهنگ").slice(0, 100),
    filename: req.file.filename
  });

  fs.writeFileSync(dataFile, JSON.stringify(songs, null, 2));
  res.redirect("/");
});

app.get("/audio/:id", (req, res) => {
  const song = getSongs().find(s => s.id === req.params.id);
  if (!song) return res.status(404).send("آهنگ پیدا نشد");
  res.sendFile(path.join(songsDir, song.filename));
});

app.get("/download/:id", (req, res) => {
  const song = getSongs().find(s => s.id === req.params.id);
  if (!song) return res.status(404).send("آهنگ پیدا نشد");
  res.download(path.join(songsDir, song.filename), song.title + path.extname(song.filename || ".mp3"));
});

app.listen(PORT, () => console.log("Music site running on port " + PORT));
