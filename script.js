(function () {
  "use strict";

  // ---------- palette presets (dark → light) ----------
  const PALETTES = [
    // monochrome
    { name: 'Noir', colors: ['#0a0a0a', '#f2ede0'] },
    { name: 'Ash', colors: ['#0a0a0a', '#4a4a4a', '#8a8a8a', '#e0e0e0'] },
    { name: 'Newsprint', colors: ['#121212', '#6b675e', '#cfc8b8'] },
    // terminal / classic
    { name: 'Terminal', colors: ['#031409', '#0f6b2c', '#39d15c', '#b9ffca'] },
    { name: 'Amber CRT', colors: ['#0d0600', '#7a2e00', '#ff8c1a', '#ffcf8a'] },
    { name: 'IBM Blue', colors: ['#000000', '#1f3a93', '#4aa3ff', '#bfe3ff'] },
    { name: 'GameBoy', colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] },
    // neon
    { name: 'Synthwave', colors: ['#160821', '#5b158f', '#e0218a', '#ff6ec7', '#ffe9c7'] },
    { name: 'Vaporwave', colors: ['#1a0b2e', '#6a2c91', '#ff6ec7', '#7fdbff', '#fdf5e6'] },
    { name: 'Cyberpunk', colors: ['#05010f', '#ff003c', '#00fff9', '#f5f5f5'] },
    // cool tones
    { name: 'Blueprint', colors: ['#02182b', '#0c4a76', '#3f9fce', '#cdeeff'] },
    { name: 'Deep Sea', colors: ['#020814', '#0a3d62', '#1e88a8', '#7fd8e0'] },
    { name: 'Arctic', colors: ['#06111c', '#1c4e63', '#5aa9c9', '#eaf6fb'] },
    // warm / earth
    { name: 'Sepia', colors: ['#1c1108', '#6b4226', '#c98a4b', '#f2dfc0'] },
    { name: 'Campfire', colors: ['#0a0400', '#4a1500', '#d94f00', '#ff9d3d', '#ffdca8'] },
    { name: 'Gold', colors: ['#1a1305', '#6b4e0a', '#c9971f', '#ffd873'] },
    { name: 'Forest', colors: ['#0a1408', '#254d1f', '#5f8a3f', '#c9d97a'] },
    { name: 'Clay', colors: ['#1a0f0a', '#5c3620', '#a8623a', '#e0b088'] },
    { name: 'Rose Quartz', colors: ['#1a0510', '#6b1f45', '#d94f8c', '#ffc2dd'] },
    { name: 'Toxic', colors: ['#050f02', '#2c6e0a', '#8fe000', '#e8ffb0'] },
  ];
  let paletteIndex = 2; // default palette — reads clearly in both modes

  // ---------- state ----------
  const state = {
    mode: 0,        // 0 ascii, 1 dither
    colorMode: 0,   // 0 palette, 1 full color
    cellSize: 5,
    pixelSize: 3,
    matrixSize: 2,
    levels: 4,
    strength: 1.0,
    contrast: 1.15,
    brightness: 0.0,
    invert: 0,
  };

  // ---------- canvas / gl setup ----------
  const frame = document.getElementById('frame');
  const canvas = document.getElementById('glcanvas');
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) {
    frame.innerHTML = '<div style="padding:24px;color:#f2f0ea;font-size:13px;">WebGL2 is not available in this browser.</div>';
    return;
  }

  const VERT = `#version 300 es
  in vec2 aPosition;
  void main(){ gl_Position = vec4(aPosition, 0.0, 1.0); }
  `;

  const FRAG = `#version 300 es
  precision highp float;
  precision highp int;

  uniform sampler2D uImage;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform int uMode;
  uniform float uCellSize;
  uniform float uPixelSize;
  uniform int uMatrixSize;
  uniform int uColorMode;
  uniform int uPaletteCount;
  uniform vec3 uPalette[6];
  uniform float uLevels;
  uniform float uDitherStrength;
  uniform float uContrast;
  uniform float uBrightness;
  uniform float uInvert;

  out vec4 fragColor;

  const float BAYER2[4] = float[4](0.0,2.0,3.0,1.0);
  const float BAYER4[16] = float[16](0.0,8.0,2.0,10.0,12.0,4.0,14.0,6.0,3.0,11.0,1.0,9.0,15.0,7.0,13.0,5.0);
  const float BAYER8[64] = float[64](
    0.0,48.0,12.0,60.0,3.0,51.0,15.0,63.0,
    32.0,16.0,44.0,28.0,35.0,19.0,47.0,31.0,
    8.0,56.0,4.0,52.0,11.0,59.0,7.0,55.0,
    40.0,24.0,36.0,20.0,43.0,27.0,39.0,23.0,
    2.0,50.0,14.0,62.0,1.0,49.0,13.0,61.0,
    34.0,18.0,46.0,30.0,33.0,17.0,45.0,29.0,
    10.0,58.0,6.0,54.0,9.0,57.0,5.0,53.0,
    42.0,26.0,38.0,22.0,41.0,25.0,37.0,21.0
  );

  // 10 procedural glyphs packed as 25-bit masks on a 5x5 grid (dark -> dense)
  const int CHAR_BITMAPS[10] = int[10](0,4,132,31744,162944,18157905,32537631,11512810,22511061,33095231);

  float getBayerValue(vec2 coord){
    if (uMatrixSize == 0) {
      ivec2 p = ivec2(mod(coord, 2.0));
      return (BAYER2[p.y*2+p.x] + 0.5) / 4.0;
    } else if (uMatrixSize == 1) {
      ivec2 p = ivec2(mod(coord, 4.0));
      return (BAYER4[p.y*4+p.x] + 0.5) / 16.0;
    } else {
      ivec2 p = ivec2(mod(coord, 8.0));
      return (BAYER8[p.y*8+p.x] + 0.5) / 64.0;
    }
  }

  float luminance(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

  vec2 coverUv(vec2 fragCoord){
    float canvasR = uResolution.x / uResolution.y;
    float imageR = uImageSize.x / uImageSize.y;
    vec2 uv = fragCoord / uResolution;
    vec2 scale;
    if (canvasR > imageR) {
      scale = vec2(1.0, imageR / canvasR);
    } else {
      scale = vec2(canvasR / imageR, 1.0);
    }
    return (uv - 0.5) * scale + 0.5;
  }

  int charBit(int idx, ivec2 gp){
    int n = CHAR_BITMAPS[idx];
    int shift = (4 - gp.y) * 5 + (4 - gp.x);
    return (n >> shift) & 1;
  }

  void main(){
    vec2 fragCoord = gl_FragCoord.xy;
    vec3 outColor;

    if (uMode == 1) {
      // ---------------- DITHER ----------------
      vec2 blockCoord = floor(fragCoord / uPixelSize) * uPixelSize + uPixelSize * 0.5;
      vec2 uv = coverUv(blockCoord);
      vec3 col = texture(uImage, clamp(uv, 0.0, 1.0)).rgb;
      col = clamp((col - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
      float bayerVal = getBayerValue(fragCoord);

      if (uColorMode == 1) {
        vec3 c = uInvert > 0.5 ? 1.0 - col : col;
        vec3 dith = c + (bayerVal - 0.5) / max(uLevels, 1.0) * uDitherStrength;
        dith = floor(clamp(dith, 0.0, 1.0) * uLevels + 0.5) / uLevels;
        outColor = clamp(dith, 0.0, 1.0);
      } else {
        float lum = luminance(col);
        float lumEff = uInvert > 0.5 ? 1.0 - lum : lum;
        float scaled = clamp(lumEff, 0.0, 1.0) * float(uPaletteCount - 1);
        int i0 = clamp(int(floor(scaled)), 0, uPaletteCount - 1);
        int i1 = clamp(i0 + 1, 0, uPaletteCount - 1);
        float frac = scaled - float(i0);
        outColor = frac > bayerVal ? uPalette[i1] : uPalette[i0];
      }

    } else {
      // ---------------- ASCII ----------------
      vec2 cellId = floor(fragCoord / uCellSize);
      vec2 cellCenter = cellId * uCellSize + uCellSize * 0.5;

      vec3 sum = vec3(0.0);
      for (int dx = -1; dx <= 1; dx++){
        for (int dy = -1; dy <= 1; dy++){
          vec2 offs = vec2(float(dx), float(dy)) * (uCellSize * 0.28);
          vec2 uv2 = coverUv(cellCenter + offs);
          sum += texture(uImage, clamp(uv2, 0.0, 1.0)).rgb;
        }
      }
      vec3 col = sum / 9.0;
      col = clamp((col - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);
      float lum = luminance(col);
      float lumEff = uInvert > 0.5 ? 1.0 - lum : lum;
      int idx = clamp(int(lumEff * 9.999), 0, 9);

      vec2 local = fragCoord - cellId * uCellSize;
      vec2 p = clamp(local / uCellSize, 0.0, 0.999);
      ivec2 gp = ivec2(floor(p * 5.0));
      int bit = charBit(idx, gp);

      vec3 fg, bg;
      if (uColorMode == 1) {
        fg = uInvert > 0.5 ? 1.0 - col : col;
        bg = vec3(0.0);
      } else {
        float bayerVal = getBayerValue(cellId);
        float scaled = lumEff * float(uPaletteCount - 1);
        int i0 = clamp(int(floor(scaled)), 0, uPaletteCount - 1);
        int i1 = clamp(i0 + 1, 0, uPaletteCount - 1);
        float frac = scaled - float(i0);
        fg = frac > bayerVal ? uPalette[i1] : uPalette[i0];
        bg = uInvert > 0.5 ? uPalette[uPaletteCount - 1] : uPalette[0];
      }
      outColor = mix(bg, fg, float(bit));
    }

    fragColor = vec4(outColor, 1.0);
  }
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw new Error('Program link failed');
  }
  gl.useProgram(program);

  // full-screen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uImage', 'uResolution', 'uImageSize', 'uMode', 'uCellSize', 'uPixelSize', 'uMatrixSize',
    'uColorMode', 'uPaletteCount', 'uPalette', 'uLevels', 'uDitherStrength', 'uContrast',
    'uBrightness', 'uInvert'].forEach(n => U[n] = gl.getUniformLocation(program, n));

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let imageSize = [4, 3];

  // ---------- procedural demo image (no network needed) ----------
  function makeDemoImage() {
    const c = document.createElement('canvas');
    c.width = 960; c.height = 720;
    const ctx = c.getContext('2d');

    const sky = ctx.createLinearGradient(0, 0, 0, c.height * 0.72);
    sky.addColorStop(0, '#1a1230');
    sky.addColorStop(0.42, '#5c2a5e');
    sky.addColorStop(0.68, '#e2593f');
    sky.addColorStop(1, '#ffcf74');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, c.width, c.height);

    // stars
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * c.width, y = Math.random() * c.height * 0.45;
      const r = Math.random() * 1.3 + 0.2;
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // sun
    const sx = c.width * 0.68, sy = c.height * 0.46, sr = 92;
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.2);
    glow.addColorStop(0, 'rgba(255,224,150,0.55)');
    glow.addColorStop(1, 'rgba(255,224,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

    // mountain layers
    function ridge(baseY, amp, color, seed) {
      ctx.beginPath();
      ctx.moveTo(0, c.height);
      ctx.lineTo(0, baseY);
      const pts = 9;
      for (let i = 0; i <= pts; i++) {
        const x = (i / pts) * c.width;
        const y = baseY - Math.sin(i * 1.7 + seed) * amp - Math.cos(i * 0.6 + seed * 2.0) * amp * 0.5 - amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(c.width, c.height);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
    ridge(c.height * 0.62, 34, '#3a1e42', 1.2);
    ridge(c.height * 0.72, 40, '#241333', 3.1);
    ridge(c.height * 0.85, 46, '#150a1e', 5.4);

    // lake reflection band
    const water = ctx.createLinearGradient(0, c.height * 0.85, 0, c.height);
    water.addColorStop(0, '#2a1030');
    water.addColorStop(1, '#0a0510');
    ctx.fillStyle = water;
    ctx.fillRect(0, c.height * 0.85, c.width, c.height * 0.15);
    ctx.fillStyle = 'rgba(255,224,150,0.18)';
    ctx.fillRect(sx - 40, c.height * 0.85, 80, c.height * 0.15);

    return c;
  }

  function setImageSource(src) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const w = src.naturalWidth || src.width;
    const h = src.naturalHeight || src.height;
    imageSize = [w, h];
    frame.style.width = `min(100%, 75vh * ${w / h})`;
    frame.style.aspectRatio = w + ' / ' + h;
    frame.style.margin = '0 auto';
    frame.classList.remove('empty');
    resizeCanvas();
    render();
    updateStatus();
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => setImageSource(img);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------- resize ----------
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(frame.clientWidth * dpr));
    const h = Math.max(1, Math.round(frame.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  new ResizeObserver(() => { resizeCanvas(); render(); }).observe(frame);

  // ---------- render ----------
  function flattenPalette(hexArr) {
    const out = new Float32Array(18);
    for (let i = 0; i < 6; i++) {
      const hex = hexArr[Math.min(i, hexArr.length - 1)];
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      out[i * 3] = r; out[i * 3 + 1] = g; out[i * 3 + 2] = b;
    }
    return out;
  }

  function render() {
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(U.uImage, 0);
    gl.uniform2f(U.uResolution, canvas.width, canvas.height);
    gl.uniform2f(U.uImageSize, imageSize[0], imageSize[1]);
    gl.uniform1i(U.uMode, state.mode);
    gl.uniform1f(U.uCellSize, state.cellSize);
    gl.uniform1f(U.uPixelSize, state.pixelSize);
    gl.uniform1i(U.uMatrixSize, state.matrixSize);
    gl.uniform1i(U.uColorMode, state.colorMode);

    const pal = PALETTES[paletteIndex];
    gl.uniform1i(U.uPaletteCount, pal.colors.length);
    gl.uniform3fv(U.uPalette, flattenPalette(pal.colors));

    gl.uniform1f(U.uLevels, state.levels);
    gl.uniform1f(U.uDitherStrength, state.strength);
    gl.uniform1f(U.uContrast, state.contrast);
    gl.uniform1f(U.uBrightness, state.brightness);
    gl.uniform1f(U.uInvert, state.invert);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function updateStatus() {
    document.getElementById('statusLeft').textContent =
      Math.round(imageSize[0]) + '×' + Math.round(imageSize[1]);
    let right;
    if (state.mode === 0) {
      right = '<b>ASCII</b> · cell ' + state.cellSize + 'px · 10 glyphs · ' +
        (state.colorMode === 1 ? 'full color' : PALETTES[paletteIndex].name.toLowerCase());
    } else {
      const mSize = ['2×2', '4×4', '8×8'][state.matrixSize];
      right = '<b>DITHER</b> · ' + mSize + ' bayer · pixel ' + state.pixelSize + 'px · ' +
        (state.colorMode === 1 ? state.levels + ' levels/ch' : PALETTES[paletteIndex].name.toLowerCase());
    }
    document.getElementById('statusRight').innerHTML = right;
  }

  // ---------- UI wiring ----------
  function seg(id, key, cb) {
    const el = document.getElementById(id);
    el.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state[key] = parseInt(btn.dataset[key === 'mode' ? 'mode' : 'color'], 10);
        cb && cb();
        render(); updateStatus();
      });
    });
  }
  seg('modeSeg', 'mode', () => {
    document.getElementById('asciiSection').style.display = state.mode === 0 ? '' : 'none';
    document.getElementById('ditherSection').style.display = state.mode === 1 ? '' : 'none';
  });
  seg('colorSeg', 'colorMode', () => {
    const showPalette = state.colorMode === 0;
    document.getElementById('paletteSection').style.display = showPalette ? '' : 'none';
    document.getElementById('levelsRow').style.display = (!showPalette && state.mode === 1) ? '' : 'none';
    document.getElementById('levels').style.display = (!showPalette && state.mode === 1) ? '' : 'none';
    document.getElementById('strengthRow').style.display = (!showPalette && state.mode === 1) ? '' : 'none';
    document.getElementById('strength').style.display = (!showPalette && state.mode === 1) ? '' : 'none';
  });
  // re-run colorSeg visibility logic whenever mode changes too
  document.getElementById('modeSeg').addEventListener('click', () => {
    const showPalette = state.colorMode === 0;
    document.getElementById('levelsRow').style.display = (!showPalette && state.mode === 1) ? '' : 'none';
    document.getElementById('levels').style.display = (!showPalette && state.mode === 1) ? '' : 'none';
    document.getElementById('strengthRow').style.display = (!showPalette && state.mode === 1) ? '' : 'none';
    document.getElementById('strength').style.display = (!showPalette && state.mode === 1) ? '' : 'none';
  });

  const swatchesEl = document.getElementById('swatches');
  PALETTES.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'swatch' + (i === paletteIndex ? ' active' : '');
    b.innerHTML = '<div class="chips">' + p.colors.map(c => `<i style="background:${c}"></i>`).join('') + '</div><div class="name">' + p.name + '</div>';
    b.addEventListener('click', () => {
      paletteIndex = i;
      swatchesEl.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      b.classList.add('active');
      render(); updateStatus();
    });
    swatchesEl.appendChild(b);
  });

  function bindSlider(id, key, fmt) {
    const el = document.getElementById(id);
    const valEl = document.getElementById(id + 'Val');
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      state[key] = v;
      if (valEl) valEl.textContent = fmt ? fmt(v) : v;
      render(); updateStatus();
    });
  }
  bindSlider('cellSize', 'cellSize', v => v + 'px');
  bindSlider('pixelSize', 'pixelSize', v => v + 'px');
  bindSlider('levels', 'levels', v => v);
  bindSlider('strength', 'strength', v => v.toFixed(2));
  bindSlider('contrast', 'contrast', v => v.toFixed(2));
  bindSlider('brightness', 'brightness', v => v.toFixed(2));

  document.getElementById('matrixSize').addEventListener('change', e => {
    state.matrixSize = parseInt(e.target.value, 10);
    render(); updateStatus();
  });

  const invertSwitch = document.getElementById('invertSwitch');
  invertSwitch.addEventListener('click', () => {
    state.invert = state.invert ? 0 : 1;
    invertSwitch.classList.toggle('on', !!state.invert);
    render();
  });

  // file upload / drag-drop
  const fileInput = document.getElementById('fileInput');
  document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
  document.getElementById('dropzone').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  frame.addEventListener('click', () => { if (frame.classList.contains('empty')) fileInput.click(); });
  fileInput.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });

  ['dragenter', 'dragover'].forEach(ev => frame.addEventListener(ev, e => {
    e.preventDefault(); frame.classList.add('drag');
  }));
  ['dragleave', 'drop'].forEach(ev => frame.addEventListener(ev, e => {
    e.preventDefault(); frame.classList.remove('drag');
  }));
  frame.addEventListener('drop', e => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  document.getElementById('demoBtn').addEventListener('click', () => setImageSource(makeDemoImage()));

  document.getElementById('downloadBtn').addEventListener('click', () => {
    render();
    const link = document.createElement('a');
    link.download = (state.mode === 0 ? 'ascii' : 'dither') + '-effect.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // ---------- boot ----------
  resizeCanvas();
  const defaultImg = new Image();
  defaultImg.onload = () => setImageSource(defaultImg);
  defaultImg.onerror = () => setImageSource(makeDemoImage());
  defaultImg.src = 'puma.jpg';
})();
