/*
 * body3d.js - interactive 3D muscle body (classic script, attaches window.Body3D)
 *
 * Models: body.glb (male) and body-female.glb (female), next to this file, derived from Z-Anatomy (CC BY-SA 4.0),
 * which is based on BodyParts3D (c) The Database Center for Life Science. See LICENSE-model.txt.
 *
 * Usage:
 *   const h = Body3D.mount(el, { lit:{chest:2, triceps:1}, autoRotate:true, interactive:true,
 *                                sex:'male'|'female', onPick:(group)=>{} });
 *   h.setLit({quads:2}); h.setSelected('quads'); h.setView('back'); h.setSex('female'); h.destroy();
 *
 * three.js is loaded lazily on first mount from jsDelivr, pinned to 0.160.0.
 */
(function () {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
  var GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm';

  var GROUPS = ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'traps',
    'lats', 'lowerback', 'glutes', 'quads', 'adductors', 'hams', 'calves'];

  // Resolve the models relative to this script (works wherever the folder is served).
  var scriptSrc = (document.currentScript && document.currentScript.src) || location.href;
  var MODEL_URL = { male: new URL('body.glb', scriptSrc).href, female: new URL('body-female.glb', scriptSrc).href };
  /* hosts that can't serve .glb can provide the same bytes as base64 globals */
  var MODEL_B64 = { male: 'GL_BODY_GLB', female: 'GL_BODY_GLB_F' };
  function normSex(v) { return v === 'female' ? 'female' : 'male'; }

  // Look. Colours are sRGB hex.
  var LOOK = {
    // glow = intensity of the additive halo shell around a lit group
    base: { color: 0x2a2c30, emissive: 0x000000, ei: 0, rough: 0.38, metal: 0.3, glow: 0 },
    body: { color: 0x2a2c30, emissive: 0x000000, ei: 0, rough: 0.38, metal: 0.3, glow: 0 },
    lit1: { color: 0x85888e, emissive: 0xffffff, ei: 0.07, rough: 0.4, metal: 0.1, glow: 0.4 },
    lit2: { color: 0xc9cbcf, emissive: 0xffffff, ei: 0.24, rough: 0.35, metal: 0.05, glow: 0.85 },
    sel:  { color: 0xdedfe2, emissive: 0xffffff, ei: 0.4, rough: 0.32, metal: 0.05, glow: 1.0 }
  };

  var libPromise = null, modelPromises = {};

  function loadLib() {
    if (!libPromise) {
      libPromise = Promise.all([import(THREE_URL), import(GLTF_URL)]).then(function (m) {
        return { THREE: m[0], GLTFLoader: m[1].GLTFLoader };
      });
      libPromise.catch(function () { libPromise = null; });
    }
    return libPromise;
  }

  // One cached template per sex, loaded lazily the first time it is needed.
  function loadModel(sex) {
    sex = normSex(sex);
    if (!modelPromises[sex]) {
      var p = loadLib().then(function (lib) {
        return new Promise(function (resolve, reject) {
          var loader = new lib.GLTFLoader();
          var b64 = window[MODEL_B64[sex]];
          if (b64) {
            var bin = atob(b64), buf = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            loader.parse(buf.buffer, '', function (gltf) { resolve(gltf.scene); }, reject);
          } else loader.load(MODEL_URL[sex], function (gltf) { resolve(gltf.scene); }, undefined, reject);
        });
      });
      modelPromises[sex] = p;
      p.catch(function () { if (modelPromises[sex] === p) delete modelPromises[sex]; });
    }
    return modelPromises[sex];
  }

  function lookFor(level, selected, isBody) {
    if (selected) return LOOK.sel;
    if (level >= 2) return LOOK.lit2;
    if (level >= 1) return LOOK.lit1;
    return isBody ? LOOK.body : LOOK.base;
  }

  function mount(container, opts) {
    opts = opts || {};
    var state = {
      lit: Object.assign({}, opts.lit || {}),
      selected: null,
      autoRotate: opts.autoRotate !== false,
      interactive: opts.interactive !== false,
      onPick: typeof opts.onPick === 'function' ? opts.onPick : null,
      selectOnPick: opts.selectOnPick !== false,
      sex: normSex(opts.sex),
      yaw: 0,
      destroyed: false
    };
    var buildToken = 0;
    var t = null;            // runtime (set once three + model are ready)
    var pendingView = null;

    var handle = {
      ready: null,
      setLit: function (obj) { state.lit = Object.assign({}, obj || {}); if (t) t.applyLook(); return handle; },
      setSelected: function (g) { state.selected = (g && GROUPS.indexOf(g) >= 0) ? g : null; if (t) t.applyLook(); return handle; },
      setView: function (v) { if (t) t.setView(v); else pendingView = v; return handle; },
      setAutoRotate: function (on) { state.autoRotate = !!on; if (t) t.kick(); return handle; },
      // Swap the body in place (lit / selected / rotation are kept). Returns a promise for the swap.
      setSex: function (sex) {
        sex = normSex(sex);
        if (sex === state.sex) return Promise.resolve(handle);
        state.sex = sex;
        return show(sex).catch(function (err) { console.error('[Body3D] failed to load', err); return handle; });
      },
      getSex: function () { return state.sex; },
      destroy: function () { state.destroyed = true; buildToken++; if (t) t.destroy(); t = null; }
    };

    function show(sex) {
      var token = ++buildToken;
      return loadModel(sex).then(function (template) {
        return loadLib().then(function (lib) {
          if (state.destroyed || token !== buildToken) return handle;
          if (t) t.destroy();
          t = build(lib.THREE, template, container, state);
          if (pendingView) { t.setView(pendingView); pendingView = null; }
          return handle;
        });
      });
    }

    handle.ready = show(state.sex).catch(function (err) {
      console.error('[Body3D] failed to load', err);
      container.setAttribute('data-body3d-error', '1');
      throw err;
    });
    handle.ready.catch(function () {});
    return handle;
  }

  function build(THREE, template, container, state) {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    
    var canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;-webkit-tap-highlight-color:transparent;outline:none;' +
      (state.interactive ? 'cursor:grab;' : '');
    canvas.setAttribute('aria-label', '3D muscle body');
    container.appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

    // Lights: soft grey studio. Key from above-front, low fill, strong rim lights from behind
    // so the silhouette and the muscle edges catch light on the dark glossy body.
    scene.add(new THREE.HemisphereLight(0xc4c9d0, 0x121315, 0.7));
    var key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(0.8, 4, 2.4); scene.add(key);
    var fill = new THREE.DirectionalLight(0xdfe4ea, 0.55); fill.position.set(-2.5, 0.3, 2.5); scene.add(fill);
    var rimL = new THREE.DirectionalLight(0xffffff, 4.2); rimL.position.set(-2.6, 1.6, -2.4); scene.add(rimL);
    var rimR = new THREE.DirectionalLight(0xffffff, 3.6); rimR.position.set(2.6, 1.0, -2.4); scene.add(rimR);
    var top = new THREE.DirectionalLight(0xffffff, 1.4); top.position.set(0, 4, -1.5); scene.add(top);

    var pivot = new THREE.Group();
    scene.add(pivot);
    var model = template.clone(true);
    pivot.add(model);

    // Very faint contact shadow ellipse.
    var shadowTex = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d');
      var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
    })();
    var shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 });
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), shadowMat);
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.0; shadow.renderOrder = -1;
    scene.add(shadow);

    // Outline shader for the selected group (back-face hull pushed out in view space).
    var outlineMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xffffff) }, uWidth: { value: 0.006 }, uOpacity: { value: 0.0 } },
      vertexShader: 'uniform float uWidth; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * normal); mv.xyz += n * uWidth; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; void main(){ gl_FragColor = vec4(uColor, uOpacity); }',
      side: THREE.BackSide, transparent: true, depthWrite: false
    });

    // Glow shells for lit groups: the group's surface pushed out along the normal, drawn additively
    // with a fresnel falloff (bright at grazing angles -> soft halo at the silhouette) and faded out
    // towards the group's border so the shell edge never shows as a line.
    var glowVS = 'attribute float aFade; uniform float uWidth; varying vec3 vN; varying vec3 vP; varying float vF;' +
      'void main(){ vec3 p = position + normal * uWidth * (0.35 + 0.65 * aFade); vec4 mv = modelViewMatrix * vec4(p, 1.0);' +
      ' vN = normalize(normalMatrix * normal); vP = mv.xyz; vF = aFade; gl_Position = projectionMatrix * mv; }';
    var glowFS = 'uniform float uI; uniform float uPow; uniform float uBase; varying vec3 vN; varying vec3 vP; varying float vF;' +
      'void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(-vP))); float a = uI * vF * (uBase + (1.0 - uBase) * pow(f, uPow));' +
      ' gl_FragColor = vec4(1.0, 1.0, 1.0, clamp(a, 0.0, 1.0)); }';
    function glowMat(width, pow, base) {
      return new THREE.ShaderMaterial({
        uniforms: { uI: { value: 0 }, uWidth: { value: width }, uPow: { value: pow }, uBase: { value: base } },
        vertexShader: glowVS, fragmentShader: glowFS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
    }
    // per-vertex fade (0 at the group's open border -> 1 a few edge rings inside), cached on the shared geometry
    function ensureFade(geo) {
      if (geo.getAttribute('aFade')) return;
      var n = geo.attributes.position.count, idx = geo.index ? geo.index.array : null;
      var fade = new Float32Array(n);
      if (idx) {
        var edges = new Map(), adj = [];
        for (var i = 0; i < n; i++) adj.push([]);
        for (var t = 0; t < idx.length; t += 3) for (var j = 0; j < 3; j++) {
          var a = idx[t + j], b = idx[t + (j + 1) % 3], key = a < b ? a * n + b : b * n + a;
          edges.set(key, (edges.get(key) || 0) + 1); adj[a].push(b);
        }
        var ring = new Int32Array(n).fill(-1), q = [];
        edges.forEach(function (c, key) {
          if (c !== 1) return;
          var a = Math.floor(key / n), b = key % n;
          if (ring[a] < 0) { ring[a] = 0; q.push(a); }
          if (ring[b] < 0) { ring[b] = 0; q.push(b); }
        });
        var RINGS = 6;
        for (var h = 0; h < q.length; h++) {
          var v = q[h]; if (ring[v] >= RINGS) continue;
          for (var e = 0; e < adj[v].length; e++) { var u = adj[v][e]; if (ring[u] < 0) { ring[u] = ring[v] + 1; q.push(u); } }
        }
        for (var k = 0; k < n; k++) { var r = ring[k] < 0 ? RINGS : ring[k]; var x = Math.min(1, r / RINGS); fade[k] = x * x * (3 - 2 * x); }
      } else fade.fill(1);
      geo.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
    }
    var glows = [];        // per group: its material and the two shells (inner glow, wider halo)

    var meshes = {};       // group -> mesh
    var outlines = {};     // group -> outline mesh
    var pickables = [];
    var mats = [];
    // collect first: the loop below adds helper meshes (outline, glow shells) as children
    var srcMeshes = [];
    model.traverse(function (o) { if (o.isMesh) srcMeshes.push(o); });
    srcMeshes.forEach(function (o) {
      var name = o.name || (o.parent && o.parent.name) || '';
      var g = GROUPS.indexOf(name) >= 0 ? name : (GROUPS.indexOf(o.parent && o.parent.name) >= 0 ? o.parent.name : 'body');
      var isBody = g === 'body';
      var m = new THREE.MeshPhysicalMaterial({ color: LOOK.base.color, roughness: LOOK.base.rough, metalness: LOOK.base.metal, clearcoat: 0.55, clearcoatRoughness: 0.3 });
      m.userData = { group: g, isBody: isBody, tColor: new THREE.Color(), tEm: new THREE.Color(), tEi: 0, tRough: 0.5, tMetal: 0.1, tGlow: 0, glow: 0 };
      o.material = m;
      o.userData.group = g;
      mats.push(m);
      pickables.push(o);
      if (!isBody) {
        meshes[g] = o;
        var ol = new THREE.Mesh(o.geometry, outlineMat);
        ol.visible = false; ol.renderOrder = 2; ol.raycast = function () {};
        o.add(ol); outlines[g] = ol;
        ensureFade(o.geometry);
        var gi = glowMat(0.006, 2.0, 0.12), gh = glowMat(0.035, 1.8, 0.0);
        var mi = new THREE.Mesh(o.geometry, gi), mh = new THREE.Mesh(o.geometry, gh);
        [mi, mh].forEach(function (x, i) { x.visible = false; x.renderOrder = 3 + i; x.raycast = function () {}; o.add(x); });
        glows.push({ group: g, mat: m, inner: gi, halo: gh, mi: mi, mh: mh });
      }
    });

    function setTargets(snap) {
      mats.forEach(function (m) {
        var u = m.userData;
        var lvl = +state.lit[u.group] || 0;
        var L = u.isBody ? LOOK.body : lookFor(lvl, state.selected === u.group, false);
        u.tColor.setHex(L.color); u.tEm.setHex(L.emissive); u.tEi = L.ei; u.tRough = L.rough; u.tMetal = L.metal; u.tGlow = L.glow || 0;
        if (snap) { m.color.copy(u.tColor); m.emissive.copy(u.tEm); m.emissiveIntensity = u.tEi; m.roughness = u.tRough; m.metalness = u.tMetal; u.glow = u.tGlow; }
      });
      if (snap) syncGlow();
      Object.keys(outlines).forEach(function (g) { outlines[g].visible = state.selected === g; });
    }
    function syncGlow() {
      glows.forEach(function (gl) {
        var v = gl.mat.userData.glow || 0;
        gl.inner.uniforms.uI.value = v * 0.5; gl.halo.uniforms.uI.value = v * 1.0;
        gl.mi.visible = gl.mh.visible = v > 0.003;
      });
    }
    var fading = 0;
    function applyLook() { setTargets(false); fading = 1; kick(); }
    function stepLook(dt) {
      if (fading <= 0) return false;
      var k = 1 - Math.pow(0.0005, dt);  // ~fast exponential ease
      var moving = false;
      mats.forEach(function (m) {
        var u = m.userData;
        m.color.lerp(u.tColor, k); m.emissive.lerp(u.tEm, k);
        m.emissiveIntensity += (u.tEi - m.emissiveIntensity) * k;
        m.roughness += (u.tRough - m.roughness) * k; m.metalness += (u.tMetal - m.metalness) * k;
        u.glow += (u.tGlow - u.glow) * k;
        if (Math.abs(u.tEi - m.emissiveIntensity) > 0.002 || Math.abs(m.color.r - u.tColor.r) > 0.002 || Math.abs(u.tGlow - u.glow) > 0.003) moving = true;
      });
      syncGlow();
      var tgt = state.selected ? 0.55 : 0;
      outlineMat.uniforms.uOpacity.value += (tgt - outlineMat.uniforms.uOpacity.value) * k;
      if (Math.abs(tgt - outlineMat.uniforms.uOpacity.value) > 0.005) moving = true;
      if (!moving) fading = 0;
      return moving;
    }
    setTargets(true);
    outlineMat.uniforms.uOpacity.value = state.selected ? 0.55 : 0;

    // ---- sizing ----
    var width = 1, height = 1;
    function resize() {
      var r = container.getBoundingClientRect();
      width = Math.max(1, Math.round(r.width)); height = Math.max(1, Math.round(r.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      var half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      var dist = Math.max(1.12 / half, 0.6 / (half * camera.aspect));
      camera.position.set(0, 0.05, dist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      kick();
    }
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', resize);

    // ---- rotation state ----
    var yaw = state.yaw || 0, yawVel = 0, targetYaw = null;
    var lastInteract = -1e9;
    var AUTO_SPEED = 0.28;      // rad/s
    var IDLE_MS = 2500;
    function now() { return performance.now(); }

    function setView(v) {
      var base = v === 'back' ? Math.PI : 0;
      var twoPi = Math.PI * 2;
      var k = Math.round((yaw - base) / twoPi);
      targetYaw = base + k * twoPi;
      yawVel = 0;
      lastInteract = now() + 3000; // hold the view a little longer before auto-rotate resumes
      kick();
    }

    // ---- pointer input ----
    var ptr = null;
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    function onDown(e) {
      if (!state.interactive || (e.button !== undefined && e.button !== 0)) return;
      ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t0: now(), t: now(), drag: false, dead: false };
      yawVel = 0;
    }
    function onMove(e) {
      if (!ptr || e.pointerId !== ptr.id || ptr.dead) return;
      var dx = e.clientX - ptr.x0, dy = e.clientY - ptr.y0;
      if (!ptr.drag) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { ptr.dead = true; return; } // vertical: let page scroll
        if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
          ptr.drag = true;
          try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
          canvas.style.cursor = 'grabbing';
        }
      }
      if (ptr.drag) {
        var t1 = now(), step = e.clientX - ptr.x;
        var d = step * (Math.PI * 1.6 / Math.max(width, 240));
        yaw += d; targetYaw = null;
        var dt = Math.max(16, t1 - ptr.t) / 1000;
        yawVel = Math.max(-5, Math.min(5, yawVel * 0.6 + (d / dt) * 0.4));
        ptr.x = e.clientX; ptr.t = t1;
        lastInteract = t1;
        if (e.cancelable) e.preventDefault();
        kick();
      }
    }
    function onUp(e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      var p = ptr; ptr = null;
      canvas.style.cursor = state.interactive ? 'grab' : '';
      if (p.drag) { lastInteract = now(); if (now() - p.t > 80) yawVel = 0; kick(); return; }
      if (p.dead || e.type === 'pointercancel') return;
      var moved = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
      if (moved < 8 && now() - p.t0 < 600) pick(e.clientX, e.clientY);
    }
    function pick(cx, cy) {
      var r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var hit = ray.intersectObjects(pickables, false)[0];
      var g = hit ? hit.object.userData.group : null;
      if (g === 'body') g = null;
      lastInteract = now();
      if (state.selectOnPick) { state.selected = g; applyLook(); }
      if (state.onPick) { try { state.onPick(g); } catch (err) { console.error(err); } }
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    // ---- render loop (only while visible) ----
    var visible = true, raf = 0, last = 0, dirty = true;
    function kick() { dirty = true; if (!raf && visible && !document.hidden) { last = now(); raf = requestAnimationFrame(frame); } }
    function frame(ts) {
      raf = 0;
      if (!visible || document.hidden) return;
      var dt = Math.min(0.1, Math.max(0, (ts - last) / 1000)); last = ts;
      var animating = false;
      if (targetYaw !== null) {
        var diff = targetYaw - yaw;
        yaw += diff * (1 - Math.pow(0.002, dt));
        if (Math.abs(diff) < 0.001) { yaw = targetYaw; targetYaw = null; } else animating = true;
      } else if (!ptr && Math.abs(yawVel) > 0.01) {
        yaw += yawVel * dt; yawVel *= Math.pow(0.04, dt); animating = true;
      } else if (!ptr && state.autoRotate && now() - lastInteract > IDLE_MS) {
        yaw += AUTO_SPEED * dt; animating = true;
      } else if (state.autoRotate) {
        animating = true; // waiting for idle timeout
      }
      if (targetYaw === null && Math.abs(yaw) > 64) yaw = yaw % (Math.PI * 2);
      if (stepLook(dt)) animating = true;
      if (dirty || animating) {
        pivot.rotation.y = yaw; state.yaw = yaw;
        renderer.render(scene, camera);
        dirty = false;
      }
      if (animating) raf = requestAnimationFrame(frame);
    }
    var io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.01 }) : null;
    if (io) io.observe(container);
    function onVis() { if (!document.hidden) kick(); }
    document.addEventListener('visibilitychange', onVis);

    resize();

    return {
      applyLook: applyLook,
      setView: setView,
      kick: kick,
      destroy: function () {
        if (raf) cancelAnimationFrame(raf); raf = 0; visible = false;
        if (io) io.disconnect();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
        mats.forEach(function (m) { m.dispose(); });
        glows.forEach(function (gl) { gl.inner.dispose(); gl.halo.dispose(); });
        outlineMat.dispose(); shadowMat.dispose(); shadowTex.dispose(); shadow.geometry.dispose();
        // geometry is shared with the cached template: do not dispose it here
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  window.Body3D = {
    mount: mount,
    preload: function () { return loadModel().then(function () {}); },
    groups: GROUPS.slice(),
    version: '1.0.0'
  };
})();
