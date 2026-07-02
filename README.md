# DITHER LAB — Real-Time ASCII & Dither WebGL Shader

A lightweight, high-performance WebGL2 shader application that transforms images into ASCII art and ordered Bayer dithering effects live on the GPU. 

**Live Demo**: [dithering.abhaimatta.xyz](https://dithering.abhaimatta.xyz)  
**Author Portfolio**: [abhaimatta.xyz](https://abhaimatta.xyz)

---

## ⚡ Features

- **100% Fragment Shader Processing**: Every single pixel, character glyph, luminance mapping, and Bayer threshold operation is computed in real time inside a single WebGL2 fragment shader.
- **Procedural ASCII Bitmaps**: 10 character glyphs rendered from packed 25-bit bitwise integer masks (5×5 grid) inside GLSL without loading external fonts or bitmap texture atlases.
- **Ordered Bayer Dithering**: Configurable 2×2, 4×4, and 8×8 Bayer threshold matrices for retro 1-bit / multi-level dither patterns.
- **Curated Palette Engine**: 20 retro, terminal, arcade, and neon color palettes (GameBoy, Cyberpunk, Synthwave, IBM Blue, Amber CRT, Newsprint, Sepia, etc.).
- **Full Color & Adjustment Controls**: Toggle between indexed palette mapping and full-color mode. Real-time control over cell size, pixel size, color quantization levels, dither strength, contrast, brightness, and inversion.
- **Drag & Drop + High-Res Export**: Drag and drop any image file to convert it live, or download the shaded canvas as a PNG screenshot.
- **Zero Heavy Dependencies**: Pure HTML5, Vanilla CSS, and WebGL2 JavaScript — no build step, no npm packages, no heavy libraries.

---

## 📁 Project Structure

```text
dithering-ascii-image/
├── index.html     # Main HTML document and layout
├── styles.css     # Dark-mode UI styling and layout design
├── script.js     # WebGL2 context, GLSL shaders, and UI interaction logic
└── favicon.svg    # Orange-themed dithered matrix vector favicon
```

---

## 🚀 Getting Started

No installation or build step is required. Simply open `index.html` in any modern web browser that supports WebGL2.

```bash
# Clone the repository
git clone https://github.com/mari0-0/dithering-ascii-webGL.git

# Navigate into directory
cd dithering-ascii-webGL

# Open index.html in your default browser or serve locally
```

---

## 🎨 Acknowledgements & Inspiration

Technique inspired by Codrops' writeup [*Efecto: Building Real-Time ASCII and Dithering Effects with WebGL Shaders*](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/).

---

## 👤 Author

**Abhai Matta**
- Live Demo: [dithering.abhaimatta.xyz](https://dithering.abhaimatta.xyz)
- Portfolio: [abhaimatta.xyz](https://abhaimatta.xyz)
- GitHub: [@mari0-0](https://github.com/mari0-0)

---

## 📄 License

[MIT](LICENSE)
