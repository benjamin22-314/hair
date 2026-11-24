import {
  CUSTOMERS,
  HAIR_COLORS,
  GLASSES_SHAPES,
  GLASSES_COLORS,
  GOWN_DESIGNS,
  GOWN_COLORS,
  STYLE_PRESETS,
  ACCESSORIES,
  BACKDROPS
} from './config.js';
import { snd } from './audio.js';
import { savePhoto, getAllPhotos, deletePhoto, incrementStyleCount } from './storage.js';
import { HairSalonEngine } from './hair.js';
import { initPWA } from './pwa.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  screen: 'home',
  prevScreen: 'home',
  station: 'cut',
  tool: 'scissors',
  hairColor: '#ff5ca8',
  glassesShape: 'round',
  glassesColor: '#e84c8a',
  gownColor: '#ff6ba9',
  undoStack: [],
  pendingUndo: null,
  strokeModified: false,
  strokeTarget: 'both',
  draggingAcc: null,
  pointerDown: false,
  activePointerId: null,
  lastPt: null
};

const engine = new HairSalonEngine($('#salonCanvas'));

/* ---------- Toast & Confetti ---------- */
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function confetti(count = 32) {
  const colors = ['#ff5ca8', '#ffd43b', '#52d669', '#38b6ff', '#9b5cff', '#ff7f3f'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.style.left = `${Math.random() * 100}vw`;
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = `${Math.random() * 0.4}s`;
    s.style.setProperty('--dx', `${Math.random() * 160 - 80}px`);
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 3100);
  }
}

/* ---------- Screen Navigation ---------- */
function showScreen(name) {
  state.prevScreen = state.screen;
  state.screen = name;
  $('#scrHome').classList.toggle('active', name === 'home');
  $('#scrSalon').classList.toggle('active', name === 'salon');
  $('#scrGallery').classList.toggle('active', name === 'gallery');

  if (name === 'salon') {
    engine.start();
  } else {
    engine.stop();
  }
  if (name === 'gallery') {
    renderGallery();
  }
}

/* ---------- Sound Mute Sync ---------- */
function syncMuteIcons() {
  const icon = snd.muted ? '🔇' : '🔊';
  $('#muteBtnHome').textContent = icon;
  $('#muteBtnSalon').textContent = icon;
}

['#muteBtnHome', '#muteBtnSalon'].forEach((id) => {
  $(id).addEventListener('click', () => {
    snd.toggleMute();
    syncMuteIcons();
    if (!snd.muted) snd.pop();
  });
});

/* ---------- Customer Picker on Home ---------- */
function buildCustomerCards() {
  const grid = $('#customerGrid');
  grid.innerHTML = '';

  CUSTOMERS.forEach((cust) => {
    const card = document.createElement('button');
    card.className = 'customer-card';

    const preview = document.createElement('canvas');
    const previewEngine = new HairSalonEngine(preview, { preloadBackdrops: false });
    previewEngine.loadCustomer(cust);
    previewEngine.render(true);

    const nameEl = document.createElement('div');
    nameEl.className = 'customer-name';
    nameEl.textContent = cust.name;

    card.appendChild(preview);
    card.appendChild(nameEl);

    if (cust.isMonster) {
      const badge = document.createElement('span');
      badge.className = 'monster-badge';
      badge.textContent = '👾 Monster';
      card.appendChild(badge);
    } else if (cust.isCat) {
      const badge = document.createElement('span');
      badge.className = 'cat-badge';
      badge.textContent = '🐱 Cat';
      card.appendChild(badge);
    } else if (cust.isDog) {
      const badge = document.createElement('span');
      badge.className = 'dog-badge';
      badge.textContent = '🐶 Dog';
      card.appendChild(badge);
    }

    card.addEventListener('click', () => {
      snd.pop();
      openCustomer(cust);
    });
    grid.appendChild(card);
  });
}

function openCustomer(cust) {
  engine.loadCustomer(cust);
  const emoji = cust.isMonster ? ' 👾' : (cust.isCat ? ' 🐱' : (cust.isDog ? ' 🐶' : ''));
  $('#salonCustomerName').textContent = cust.name + emoji;
  state.undoStack = [];
  syncUndoBtn();
  state.glassesShape = cust.defaultGlasses ? cust.defaultGlasses.shape : 'none';
  state.glassesColor = cust.defaultGlasses ? cust.defaultGlasses.color : '#e84c8a';
  selectStation('cut');
  showScreen('salon');
}

/* ---------- Undo ---------- */
function syncUndoBtn() {
  $('#undoBtn').disabled = state.undoStack.length === 0;
}

function pushUndo() {
  state.undoStack.push(engine.getSnapshot());
  if (state.undoStack.length > 25) state.undoStack.shift();
  syncUndoBtn();
}

$('#undoBtn').addEventListener('click', () => {
  if (!state.undoStack.length) {
    toast('Nothing to undo!');
    return;
  }
  snd.pop();
  engine.restoreSnapshot(state.undoStack.pop());
  syncUndoBtn();
  if (state.station === 'glasses' || state.station === 'style' || state.station === 'gown') renderTray();
});

$('#resetBtn').addEventListener('click', () => {
  if (!engine.customer) return;
  pushUndo();
  snd.pop();
  engine.loadCustomer(engine.customer);
  toast('Fresh start! ✨');
  renderTray();
});

$('#backHomeBtn').addEventListener('click', () => {
  snd.pop();
  showScreen('home');
});

/* ---------- Stations & Right Option Tray ---------- */
function selectStation(station) {
  state.station = station;
  $$('.station-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.station === station);
  });

  if (station === 'cut' && !['scissors', 'clippers', 'grow'].includes(state.tool)) {
    state.tool = 'scissors';
  } else if (station === 'color' && !['dye', 'glitter'].includes(state.tool)) {
    state.tool = 'dye';
  } else if (station === 'style' && !['comb', 'curler', 'crimper'].includes(state.tool)) {
    state.tool = 'comb';
  } else if (station === 'wash' && !['shampoo', 'shower', 'dryer'].includes(state.tool)) {
    state.tool = 'shampoo';
  } else if (station === 'extras') {
    state.tool = 'drag';
  } else if (station === 'glasses' || station === 'backdrop' || station === 'gown') {
    state.tool = 'none';
  }

  renderTray();
}

$$('.station-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    snd.pop();
    selectStation(btn.dataset.station);
  });
});

function makeTitle(text) {
  const h = document.createElement('div');
  h.className = 'tray-section-title';
  h.textContent = text;
  return h;
}

function makeToolChip(ico, lbl, active, onClick) {
  const b = document.createElement('button');
  b.className = 'tool-chip' + (active ? ' active' : '');
  b.innerHTML = `<span class="ico">${ico}</span><span class="lbl">${lbl}</span>`;
  b.addEventListener('click', () => {
    snd.pop();
    onClick();
  });
  return b;
}

function renderTray() {
  const tray = $('#optionTray');
  tray.innerHTML = '';

  if (state.station === 'gown') {
    tray.appendChild(makeTitle('Salon Gown'));
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    const curDesign = engine.gown ? engine.gown.design : 'none';
    GOWN_DESIGNS.forEach((d) => {
      grid.appendChild(makeToolChip(d.icon, d.label, curDesign === d.id, () => {
        pushUndo();
        if (d.id === 'none' && engine.gown) {
          snd.dryer();
          if (engine.gownClippings.length) {
            toast('Hair brushed away — nice & clean! ✨');
          }
        } else if (d.id !== 'none') {
          snd.sparkle();
        }
        engine.setGown(d.id, state.gownColor);
        renderTray();
      }));
    });
    tray.appendChild(grid);

    tray.appendChild(makeTitle('Gown Colour'));
    const swGrid = document.createElement('div');
    swGrid.className = 'swatch-grid';
    const curCol = engine.gown ? engine.gown.color : state.gownColor;
    GOWN_COLORS.forEach((c) => {
      const s = document.createElement('button');
      s.className = 'swatch' + (curCol === c.hex ? ' active' : '');
      s.style.background = c.hex;
      s.setAttribute('aria-label', c.id);
      s.addEventListener('click', () => {
        pushUndo();
        snd.pop();
        state.gownColor = c.hex;
        const designToUse = engine.gown ? engine.gown.design : 'stars';
        engine.setGown(designToUse, c.hex);
        renderTray();
      });
      swGrid.appendChild(s);
    });
    tray.appendChild(swGrid);

    const shakeBtn = document.createElement('button');
    shakeBtn.className = 'btn btn-mint tray-action-btn';
    shakeBtn.textContent = '💨 Shake Off Hair';
    shakeBtn.addEventListener('click', () => {
      if (!engine.gownClippings.length && !engine.bodyClippings.length) {
        toast('Already clean! ✨');
        return;
      }
      pushUndo();
      snd.dryer();
      engine.shakeOffClippings();
      toast('All brushed clean! ✨');
    });
    tray.appendChild(shakeBtn);
  } else if (state.station === 'cut') {
    tray.appendChild(makeTitle('Cut & Grow'));
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    [
      ['✂️', 'Scissors', 'scissors'],
      ['🪒', 'Clippers', 'clippers'],
      ['🧪', 'Grow', 'grow']
    ].forEach(([ico, lbl, id]) => {
      grid.appendChild(makeToolChip(ico, lbl, state.tool === id, () => {
        state.tool = id;
        renderTray();
      }));
    });
    tray.appendChild(grid);

    const growAll = document.createElement('button');
    growAll.className = 'btn btn-mint tray-action-btn';
    growAll.textContent = '✨ Grow All';
    growAll.addEventListener('click', () => {
      pushUndo();
      snd.grow();
      engine.growAllHair();
    });
    tray.appendChild(growAll);
  } else if (state.station === 'color') {
    tray.appendChild(makeTitle('Brush'));
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    [
      ['🖌️', 'Paint', 'dye'],
      ['✨', 'Glitter', 'glitter']
    ].forEach(([ico, lbl, id]) => {
      grid.appendChild(makeToolChip(ico, lbl, state.tool === id, () => {
        state.tool = id;
        renderTray();
      }));
    });
    tray.appendChild(grid);

    tray.appendChild(makeTitle('Colours'));
    const swGrid = document.createElement('div');
    swGrid.className = 'swatch-grid';
    HAIR_COLORS.forEach((c) => {
      const s = document.createElement('button');
      s.className = 'swatch' + (c.hex === 'rainbow' ? ' rainbow' : '') + (state.hairColor === c.hex ? ' active' : '');
      if (c.hex !== 'rainbow') s.style.background = c.hex;
      s.title = c.name;
      s.setAttribute('aria-label', c.name);
      s.addEventListener('click', () => {
        snd.pop();
        state.hairColor = c.hex;
        state.tool = 'dye';
        renderTray();
      });
      swGrid.appendChild(s);
    });
    tray.appendChild(swGrid);

    const colorAll = document.createElement('button');
    colorAll.className = 'btn btn-primary tray-action-btn';
    colorAll.textContent = '🎨 Colour All';
    colorAll.addEventListener('click', () => {
      pushUndo();
      snd.sparkle();
      engine.colorAllHair(state.hairColor);
    });
    tray.appendChild(colorAll);
  } else if (state.station === 'style') {
    tray.appendChild(makeTitle('Tools'));
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    [
      ['🪮', 'Comb', 'comb'],
      ['🌀', 'Curl', 'curler'],
      ['〰️', 'Crimp', 'crimper']
    ].forEach(([ico, lbl, id]) => {
      grid.appendChild(makeToolChip(ico, lbl, state.tool === id, () => {
        state.tool = id;
        renderTray();
      }));
    });
    tray.appendChild(grid);

    tray.appendChild(makeTitle('Hairstyles'));
    const pGrid = document.createElement('div');
    pGrid.className = 'tool-grid';
    STYLE_PRESETS.forEach((p) => {
      pGrid.appendChild(makeToolChip(p.icon, p.label, engine.stylePreset === p.id, () => {
        pushUndo();
        engine.setStylePreset(p.id);
        renderTray();
      }));
    });
    tray.appendChild(pGrid);
  } else if (state.station === 'wash') {
    tray.appendChild(makeTitle('Wash & Dry'));
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    [
      ['🫧', 'Shampoo', 'shampoo'],
      ['🚿', 'Shower', 'shower'],
      ['💨', 'Dryer', 'dryer']
    ].forEach(([ico, lbl, id]) => {
      grid.appendChild(makeToolChip(ico, lbl, state.tool === id, () => {
        state.tool = id;
        renderTray();
      }));
    });
    tray.appendChild(grid);
  } else if (state.station === 'glasses') {
    tray.appendChild(makeTitle('Glasses Shape'));
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    const curShape = engine.glasses ? engine.glasses.shape : 'none';
    GLASSES_SHAPES.forEach((g) => {
      grid.appendChild(makeToolChip(g.icon, g.label, curShape === g.id, () => {
        pushUndo();
        state.glassesShape = g.id;
        engine.setGlasses(g.id, state.glassesColor);
        renderTray();
      }));
    });
    tray.appendChild(grid);

    tray.appendChild(makeTitle('Frame Colour'));
    const swGrid = document.createElement('div');
    swGrid.className = 'swatch-grid';
    const curCol = engine.glasses ? engine.glasses.color : state.glassesColor;
    GLASSES_COLORS.forEach((c) => {
      const s = document.createElement('button');
      s.className = 'swatch' + (c.hex === 'rainbow' ? ' rainbow' : '') + (curCol === c.hex ? ' active' : '');
      if (c.hex !== 'rainbow') s.style.background = c.hex;
      s.setAttribute('aria-label', c.id);
      s.addEventListener('click', () => {
        pushUndo();
        snd.sparkle();
        state.glassesColor = c.hex;
        const shapeToUse = (engine.glasses && engine.glasses.shape !== 'none') ? engine.glasses.shape : 'round';
        state.glassesShape = shapeToUse;
        engine.setGlasses(shapeToUse, c.hex);
        renderTray();
      });
      swGrid.appendChild(s);
    });
    tray.appendChild(swGrid);
  } else if (state.station === 'extras') {
    tray.appendChild(makeTitle('Tap to Add (Drag!)'));
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    ACCESSORIES.forEach((acc) => {
      grid.appendChild(makeToolChip(acc.emoji, acc.label, false, () => {
        pushUndo();
        snd.sparkle();
        engine.addAccessory(acc);
      }));
    });
    tray.appendChild(grid);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-soft tray-action-btn';
    clearBtn.textContent = '🧹 Clear Extras';
    clearBtn.addEventListener('click', () => {
      if (!engine.accessories.length) return;
      pushUndo();
      snd.pop();
      engine.clearAccessories();
    });
    tray.appendChild(clearBtn);
  } else if (state.station === 'backdrop') {
    tray.appendChild(makeTitle('Photo Scene'));
    const grid = document.createElement('div');
    grid.className = 'tool-grid';
    BACKDROPS.forEach((b) => {
      grid.appendChild(makeToolChip(b.icon, b.label, engine.backdropId === b.id, () => {
        engine.setBackdrop(b.id);
        renderTray();
      }));
    });
    tray.appendChild(grid);
  }
}

/* ---------- Canvas Pointer Interaction ---------- */
const canvas = $('#salonCanvas');

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * engine.W,
    y: ((e.clientY - rect.top) / rect.height) * engine.H
  };
}

function playToolSound(tool) {
  if (tool === 'scissors') snd.snip();
  else if (tool === 'clippers') snd.buzz();
  else if (tool === 'grow') snd.grow();
  else if (tool === 'dye') snd.dye();
  else if (tool === 'glitter') snd.sparkle();
  else if (tool === 'comb') snd.comb();
  else if (tool === 'curler' || tool === 'crimper') snd.curl();
  else if (tool === 'shampoo') snd.bubble();
  else if (tool === 'shower') snd.water();
  else if (tool === 'dryer') snd.dryer();
}

const TOOL_ICONS = {
  scissors: '✂️',
  clippers: '🪒',
  grow: '🧪',
  dye: '🖌️',
  glitter: '✨',
  comb: '🪮',
  curler: '🌀',
  crimper: '〰️',
  shampoo: '🫧',
  shower: '🚿',
  dryer: '💨'
};

function commitPendingUndo() {
  if (state.pendingUndo && !state.strokeModified) {
    state.undoStack.push(state.pendingUndo);
    if (state.undoStack.length > 25) state.undoStack.shift();
    state.strokeModified = true;
    syncUndoBtn();
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  snd.init();
  if (state.pointerDown && state.activePointerId !== e.pointerId) return;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  const pt = getCanvasPoint(e);
  state.pointerDown = true;
  state.activePointerId = e.pointerId;
  state.lastPt = pt;
  state.pendingUndo = engine.getSnapshot();
  state.strokeModified = false;

  // Allow dragging accessories whenever you grab one directly
  const hitAcc = engine.findAccessoryAt(pt.x, pt.y);
  if (hitAcc && (state.station === 'extras' || state.tool === 'none' || state.tool === 'drag')) {
    commitPendingUndo();
    state.draggingAcc = hitAcc;
    engine.activeAccUid = hitAcc.uid;
    return;
  }

  if (state.tool && state.tool !== 'none' && state.tool !== 'drag') {
    state.strokeTarget = engine.detectStrokeTarget(state.tool, pt.x, pt.y);
    engine.toolCursor = { x: pt.x, y: pt.y, icon: TOOL_ICONS[state.tool] || '', active: true };
    const touched = engine.applyTool(state.tool, pt.x, pt.y, 0, 0, {
      color: state.hairColor,
      target: state.strokeTarget
    });
    if (touched) commitPendingUndo();
    if (touched || state.tool === 'shower' || state.tool === 'dryer') {
      playToolSound(state.tool);
    }
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!state.pointerDown || e.pointerId !== state.activePointerId) return;
  e.preventDefault();
  const pt = getCanvasPoint(e);
  const dx = state.lastPt ? pt.x - state.lastPt.x : 0;
  const dy = state.lastPt ? pt.y - state.lastPt.y : 0;
  state.lastPt = pt;

  if (state.draggingAcc) {
    state.draggingAcc.x = pt.x;
    state.draggingAcc.y = pt.y;
    return;
  }

  if (state.tool && state.tool !== 'none' && state.tool !== 'drag') {
    engine.toolCursor = { x: pt.x, y: pt.y, icon: TOOL_ICONS[state.tool] || '', active: true };
    const touched = engine.applyTool(state.tool, pt.x, pt.y, dx, dy, {
      color: state.hairColor,
      target: state.strokeTarget
    });
    if (touched) commitPendingUndo();
    if (touched || state.tool === 'shower' || state.tool === 'dryer') {
      playToolSound(state.tool);
    }
  }
});

function endPointer(e) {
  if (e && state.activePointerId !== null && e.pointerId !== state.activePointerId) return;
  if (state.draggingAcc) {
    const a = state.draggingAcc;
    if (Math.hypot(a.x - engine.cx, a.y - 728) < 76) {
      engine.accessories = engine.accessories.filter((item) => item.uid !== a.uid);
      snd.pop();
      toast('Removed! 🗑️');
    }
  }
  state.pointerDown = false;
  state.activePointerId = null;
  state.draggingAcc = null;
  state.pendingUndo = null;
  state.strokeModified = false;
  engine.activeAccUid = null;
  engine.toolCursor = null;
  state.lastPt = null;
}

canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

/* ---------- Photo Capture & Lookbook ---------- */
$('#snapPhotoBtn').addEventListener('click', async () => {
  snd.shutter();
  engine.setExpression('proud', 1.8);
  confetti(34);
  try {
    const blob = await engine.capturePhotoBlob();
    if (blob) {
      await savePhoto(blob, { customer: engine.customer ? engine.customer.name : 'Look' });
      incrementStyleCount();
      toast('Photo saved to Salon Photos! 📸✨');
      setTimeout(() => snd.fanfare(), 160);
    }
  } catch {
    toast('Nice look! ✨');
  }
});

$('#openLookbookBtn').addEventListener('click', () => {
  snd.pop();
  showScreen('gallery');
});

$('#galBackBtn').addEventListener('click', () => {
  snd.pop();
  showScreen(state.prevScreen === 'salon' ? 'salon' : 'home');
});

let galUrls = [];
let viewerItem = null;
let delArmed = false;
let delTimer = null;

async function renderGallery() {
  galUrls.forEach((u) => URL.revokeObjectURL(u));
  galUrls = [];
  const grid = $('#galGrid');
  grid.innerHTML = '';

  try {
    const items = await getAllPhotos();
    items.sort((a, b) => b.ts - a.ts);
    $('#galEmpty').hidden = items.length > 0;

    items.forEach((it) => {
      const url = URL.createObjectURL(it.blob);
      galUrls.push(url);
      const card = document.createElement('button');
      card.className = 'gal-item';
      const img = document.createElement('img');
      img.src = url;
      img.alt = `${it.customer} hair look`;
      const lab = document.createElement('span');
      lab.textContent = `${it.customer} • ${new Date(it.ts).toLocaleDateString()}`;
      card.appendChild(img);
      card.appendChild(lab);
      card.addEventListener('click', () => openViewer(it, url));
      grid.appendChild(card);
    });
  } catch {
    $('#galEmpty').hidden = false;
  }
}

function resetDelBtn() {
  delArmed = false;
  clearTimeout(delTimer);
  $('#viewerDel').textContent = '🗑️ Delete';
}

function openViewer(item, url) {
  viewerItem = item;
  $('#viewerImg').src = url;
  $('#viewerMeta').textContent = `${item.customer} — ${new Date(item.ts).toLocaleDateString()}`;
  $('#viewerDl').href = url;
  $('#viewerDl').setAttribute('download', `hair-salon-${item.customer.toLowerCase()}.jpg`);
  resetDelBtn();
  $('#viewerModal').classList.add('open');
}

$('#viewerDel').addEventListener('click', async () => {
  if (!delArmed) {
    delArmed = true;
    $('#viewerDel').textContent = 'Tap again to delete!';
    delTimer = setTimeout(resetDelBtn, 3000);
    return;
  }
  if (viewerItem) {
    await deletePhoto(viewerItem.id);
    $('#viewerModal').classList.remove('open');
    toast('Photo deleted');
    renderGallery();
  }
});

$('#viewerClose').addEventListener('click', () => $('#viewerModal').classList.remove('open'));
$('#iosClose').addEventListener('click', () => $('#iosModal').classList.remove('open'));
['#viewerModal', '#iosModal'].forEach((id) => {
  const modal = $(id);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });
});

/* ---------- Boot ---------- */
syncMuteIcons();
buildCustomerCards();
initPWA({
  installBtn: $('#installBtn'),
  updateBtn: $('#updateBtn'),
  iosModal: $('#iosModal'),
  toast
});
document.addEventListener('pointerdown', () => snd.init(), { once: true });
