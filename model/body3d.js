/*
 * body3d.js - interactive 3D muscle body (classic script, attaches window.Body3D)
 *
 * Model: body.glb (next to this file), derived from Z-Anatomy (CC BY-SA 4.0),
 * which is based on BodyParts3D (c) The Database Center for Life Science. See LICENSE-model.txt.
 *
 * Usage:
 *   const h = Body3D.mount(el, { lit:{chest:2, triceps:1}, autoRotate:true, interactive:true,
 *                                onPick:(group)=>{} });
 *   h.setLit({quads:2}); h.setSelected('quads'); h.setView('back'); h.destroy();
 *
 * three.js is loaded lazily on first mount from jsDelivr, pinned to 0.160.0.
 */
(function () {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
  var GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm';

  var GROUPS = ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'traps',
    'lats', 'lowerback', 'glutes', 'quads', 'adductors', 'hams', 'calves'];

  // Resolve body.glb relative to this script (works wherever the folder is served).
  var scriptSrc = (document.currentScript && document.currentScript.src) || location.href;
  var MODEL_URL = new URL('body.glb', scriptSrc).href;

  // Look. Colours are sRGB hex.
  var LOOK = {
    base: { color: 0x4a4d53, emissive: 0x000000, ei: 0, rough: 0.55, metal: 0.18 },
    body: { color: 0x3f4247, emissive: 0x000000, ei: 0, rough: 0.6, metal: 0.15 },
    lit1: { color: 0xa4a6ab, emissive: 0x9a9ca0, ei: 0.1, rough: 0.5, metal: 0.1 },
    lit2: { color: 0xffffff, emissive: 0xffffff, ei: 0.36, rough: 0.42, metal: 0.05 },
    sel:  { color: 0xffffff, emissive: 0xffffff, ei: 0.55, rough: 0.38, metal: 0.05 }
  };

  var libPromise = null, modelPromise = null;

  function loadLib() {
    if (!libPromise) {
      libPromise = Promise.all([import(THREE_URL), import(GLTF_URL)]).then(function (m) {
        return { THREE: m[0], GLTFLoader: m[1].GLTFLoader };
      });
      libPromise.catch(function () { libPromise = null; });
    }
    return libPromise;
  }

  function loadModel() {
    if (!modelPromise) {
      modelPromise = loadLib().then(function (lib) {
        return new Promise(function (resolve, reject) {
          new lib.GLTFLoader().load(MODEL_URL, function (gltf) { resolve(gltf.scene); }, undefined, reject);
        });
      });
      modelPromise.catch(function () { modelPromise = null; });
    }
    return modelPromise;
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
      destroyed: false
    };
    var t = null;            // runtime (set once three + model are ready)
    var pendingView = null;

    var handle = {
      ready: null,
      setLit: function (obj) { state.lit = Object.assign({}, obj || {}); if (t) t.applyLook(); return handle; },
      setSelected: function (g) { state.selected = (g && GROUPS.indexOf(g) >= 0) ? g : null; if (t) t.applyLook(); return handle; },
      setView: function (v) { if (t) t.setView(v); else pendingView = v; return handle; },
      setAutoRotate: function (on) { state.autoRotate = !!on; if (t) t.kick(); return handle; },
      destroy: function () { state.destroyed = true; if (t) t.destroy(); }
    };

    handle.ready = loadModel().then(function (template) {
      return loadLib().then(function (lib) {
        if (state.destroyed) return handle;
        t = build(lib.THREE, template, container, state);
        if (pendingView) t.setView(pendingView);
        return handle;
      });
    }).catch(function (err) {
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

    // Lights: soft key from above, cool fill, rim lights from behind.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x202124, 0.9));
    var key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(0.6, 4, 2.2); scene.add(key);
    var fill = new THREE.DirectionalLight(0xdfe4ea, 0.8); fill.position.set(-2.5, 0.5, 2.5); scene.add(fill);
    var rimL = new THREE.DirectionalLight(0xffffff, 2.2); rimL.position.set(-2.6, 1.6, -3); scene.add(rimL);
    var rimR = new THREE.DirectionalLight(0xffffff, 1.8); rimR.position.set(2.6, 1.0, -3); scene.add(rimR);

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

    var meshes = {};       // group -> mesh
    var outlines = {};     // group -> outline mesh
    var pickables = [];
    var mats = [];
    model.traverse(function (o) {
      if (!o.isMesh) return;
      var name = o.name || (o.parent && o.parent.name) || '';
      var g = GROUPS.indexOf(name) >= 0 ? name : (GROUPS.indexOf(o.parent && o.parent.name) >= 0 ? o.parent.name : 'body');
      var isBody = g === 'body';
      var m = new THREE.MeshStandardMaterial({ color: LOOK.base.color, roughness: LOOK.base.rough, metalness: LOOK.base.metal });
      m.userData = { group: g, isBody: isBody, tColor: new THREE.Color(), tEm: new THREE.Color(), tEi: 0, tRough: 0.5, tMetal: 0.1 };
      o.material = m;
      o.userData.group = g;
      mats.push(m);
      pickables.push(o);
      if (!isBody) {
        meshes[g] = o;
        var ol = new THREE.Mesh(o.geometry, outlineMat);
        ol.visible = false; ol.renderOrder = 2; ol.raycast = function () {};
        o.add(ol); outlines[g] = ol;
      }
    });

    function setTargets(snap) {
      mats.forEach(function (m) {
        var u = m.userData;
        var lvl = +state.lit[u.group] || 0;
        var L = u.isBody ? LOOK.body : lookFor(lvl, state.selected === u.group, false);
        u.tColor.setHex(L.color); u.tEm.setHex(L.emissive); u.tEi = L.ei; u.tRough = L.rough; u.tMetal = L.metal;
        if (snap) { m.color.copy(u.tColor); m.emissive.copy(u.tEm); m.emissiveIntensity = u.tEi; m.roughness = u.tRough; m.metalness = u.tMetal; }
      });
      Object.keys(outlines).forEach(function (g) { outlines[g].visible = state.selected === g; });
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
        if (Math.abs(u.tEi - m.emissiveIntensity) > 0.002 || Math.abs(m.color.r - u.tColor.r) > 0.002) moving = true;
      });
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
      var dist = Math.max(1.12 / half, 0.5 / (half * camera.aspect));
      camera.position.set(0, 0.05, dist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      kick();
    }
    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', resize);

    // ---- rotation state ----
    var yaw = 0, yawVel = 0, targetYaw = null;
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
        pivot.rotation.y = yaw;
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
