# Flower Garden Reel 🌸

Recreates the "she asks for flowers" reel: a QR image sent in a chat opens a page where flowers grow in a blue sky, the camera zooms in, a message fades in, and a button opens a love letter.

## Files

| File | What it does |
|---|---|
| `index.html` | The page structure (canvas, message, button, letter pop-up) |
| `style.css` | Sky colours, Poppins text, pink button, letter card |
| `script.js` | The animation (sun, growing flowers, grass, sparkles, camera zoom) and the letter pop-up. **All your text is in `CONFIG` at the top.** |
| `assets/letter-photo.svg` | Placeholder picture shown in the letter. Replace with your own |
| `make_qr.py` | Makes the "Here are your flowers" picture (pink flower card + QR code) |
| `record_demo.py` | Optional: records the page as a 720x1280 video so you can edit it into a reel |

## 1. Preview it

Double-click `index.html`, or run a tiny server in this folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000. Add `?t=10` to the address to skip ahead 10 seconds while you edit.

## 2. Make it yours

Open `script.js` and edit `CONFIG` at the top:

- `message` - the line that fades in over the flowers
- `buttonText` - the button label
- `letter` - title, greeting, paragraphs, sign-off
- `letter.photo` - put your picture in `assets/` (e.g. `assets/us.jpg`) and change the path

Timing, zoom level and the grass layout (`seed`) are right below it.

## 3. Put it online (free, GitHub Pages)

1. Create a GitHub account and a new **public** repository (e.g. `flowers`).
2. Upload `index.html`, `style.css`, `script.js` and the `assets` folder.
3. Repo **Settings > Pages > Build and deployment**: Source = "Deploy from a branch", Branch = `main`, folder = `/ (root)`, then Save.
4. After a minute your link is `https://YOUR-USERNAME.github.io/flowers/`.

## 4. Make the QR picture

```
pip install pillow qrcode
python make_qr.py https://YOUR-USERNAME.github.io/flowers/
```

This saves `flower-card.png`. Test it with your own phone camera before sending it. Add `--blur` for a softer look.

## 5. Film the reel (same shots as the original)

1. **Chat** - screen-record a DM: she asks for flowers, you reply "Here are your flowers" and send `flower-card.png`.
2. **Scan** - film her phone scanning the picture (camera app or Google Lens).
3. **Garden** - the page opens and grows. Film the screen, or run `python record_demo.py` (needs `pip install playwright` then `playwright install chromium`) to get a clean `garden-demo.webm`.
4. **Letter** - tap "Open Special Letter" and show the letter.
5. **Edit** - in CapCut / Instagram: put the caption at the top in bold yellow (`pov: you are in ldr & she asks you for flowers 😭`) and add a trending sound.

To convert the recording for editing apps:

```
ffmpeg -i garden-demo.webm -c:v libx264 -pix_fmt yuv420p garden-demo.mp4
```

## Notes

- Fonts load from Google Fonts, so open the page with internet on.
- The original video's letter picture is a copyrighted Hello Kitty sticker, so this project ships with a neutral flower illustration instead. Use a photo of you two, or any image you have the right to use.
- The original text has a typo ("favourtite"); it is spelled correctly here.
- Respects "reduce motion" settings: those users see the finished scene straight away.
