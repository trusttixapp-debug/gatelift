/*
 * body3d.js - interactive 3D muscle body (classic script, attaches window.Body3D)
 *
 * Models: body.glb (male) and body-female.glb (female), next to this file, built from the MakeHuman base mesh (CC0)
 * with muscle-group regions adapted from Z-Anatomy (CC BY-SA 4.0),
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

  // Glow colour of lit muscles (sRGB hex). Swap here or at runtime with Body3D.setGlowColor(hex).
  var GLOW = 0x8c7cff;
  var BODY_COLOR = 0x2b2d31;

  // Look. Colours are sRGB hex. rim = on-surface fresnel glow, bloom = strength of the soft halo.
  var LOOK = null;
  function mixHex(a, b, t) {
    var r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t, g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t, bl = (a & 255) * (1 - t) + (b & 255) * t;
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
  }
  function makeLook() {
    LOOK = {
      base: { color: BODY_COLOR, emissive: 0x000000, ei: 0, rough: 0.5, metal: 0.15, rim: 0, bloom: 0 },
      body: { color: BODY_COLOR, emissive: 0x000000, ei: 0, rough: 0.5, metal: 0.15, rim: 0, bloom: 0 },
      // level 1: the skin itself takes a faint violet tint (same roughness/metalness as the body)
      lit1: { color: mixHex(BODY_COLOR, GLOW, 0.13), emissive: GLOW, ei: 0.012, rough: 0.5, metal: 0.15, rim: 0.05, bloom: 0 },
      lit2: { color: mixHex(GLOW, 0xffffff, 0.12), emissive: GLOW, ei: 0.5, rough: 0.4, metal: 0.05, rim: 0.55, bloom: 0.8 },
      sel:  { color: mixHex(GLOW, 0xffffff, 0.2), emissive: GLOW, ei: 0.62, rough: 0.38, metal: 0.05, rim: 0.7, bloom: 1.05 }
    };
  }
  makeLook();
  // matte black cloth (shorts, sports top)
  var FABRIC = { color: 0x0d0d0f, emissive: 0x000000, ei: 0, rough: 0.82, metal: 0.0, rim: 0, bloom: 0 };
  // cloth over a lit group (shorts seat / sports-bra cups) glows softly through
  var FABRIC_LIT1 = FABRIC, FABRIC_LIT = FABRIC;
  function makeFabricLit() {
    FABRIC_LIT1 = { color: mixHex(FABRIC.color, GLOW, 0.12), emissive: GLOW, ei: 0.03, rough: 0.82, metal: 0, rim: 0.05, bloom: 0 };
    FABRIC_LIT = { color: mixHex(FABRIC.color, GLOW, 0.5), emissive: GLOW, ei: 0.42, rough: 0.78, metal: 0, rim: 0.45, bloom: 0.7 };
  }
  makeFabricLit();
  var live = [];   // running viewers, so setGlowColor can recolour them

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

    // Lights: soft grey studio. Soft key from above-front, low fill, rim lights from behind so the
    // silhouette and muscle edges catch light on the satin charcoal body.
    scene.add(new THREE.HemisphereLight(0xc9ced6, 0x141517, 0.85));
    var key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(0.6, 4, 2.6); scene.add(key);
    var fill = new THREE.DirectionalLight(0xdfe4ea, 0.6); fill.position.set(-2.5, 0.3, 2.5); scene.add(fill);
    var rimL = new THREE.DirectionalLight(0xffffff, 3.0); rimL.position.set(-2.6, 1.6, -2.4); scene.add(rimL);
    var rimR = new THREE.DirectionalLight(0xffffff, 2.6); rimR.position.set(2.6, 1.0, -2.4); scene.add(rimR);
    var top = new THREE.DirectionalLight(0xffffff, 1.0); top.position.set(0, 4, -1.5); scene.add(top);

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

    // Lit glow on the surface itself: emissive fresnel rim on the group's own material
    // (no separate geometry); the soft halo comes from the selective bloom pass below.
    // Feathered region borders: skin meshes carry a per-vertex '_edge' (0 on the group border ->
    // 1 a few mm inside), so a lit group fades smoothly into the plain body colour at its edge.
    function addSurface(m, feather, baseHex) {
      m.userData.uni = { uRim: { value: 0 }, uBase: { value: new THREE.Color(baseHex) } };
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uRim = m.userData.uni.uRim; sh.uniforms.uBase = m.userData.uni.uBase;
        if (feather) sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float _edge; varying float vEdge;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = _edge;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uRim; uniform vec3 uBase;' + (feather ? ' varying float vEdge;' : ' const float vEdge = 1.0;'))
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(uBase, diffuseColor.rgb, vEdge);')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
            'totalEmissiveRadiance *= vEdge;\n' +
            'float rimF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));\n' +
            'totalEmissiveRadiance += emissive * uRim * vEdge * (0.15 + 0.85 * pow(rimF, 2.2));');
      };
      m.customProgramCacheKey = function () { return 'body3d-v14-' + (feather ? 'f' : 'n'); };
    }
    // node name -> { group, fabric }: 'chest', 'glutes_fabric', 'body_fabric', 'hem_fabric' (GLTFLoader may append _1 etc.)
    function parseNode(o) {
      var nm = o.name || '', ud = o.userData || {}, pn = (o.parent && o.parent.name) || '', pud = (o.parent && o.parent.userData) || {};
      var fabric = !!(ud.fabric || pud.fabric) || /_fabric(_\d+)?$/.test(nm) || /_fabric(_\d+)?$/.test(pn);
      var base = (ud.group || pud.group || nm.replace(/(_fabric)?(_\d+)?$/, ''));
      if (GROUPS.indexOf(base) < 0) { var pb = pn.replace(/(_fabric)?(_\d+)?$/, ''); base = GROUPS.indexOf(pb) >= 0 ? pb : 'body'; }
      return { group: base, fabric: fabric };
    }

    var meshes = {};       // group -> mesh
    var outlines = {};     // group -> outline mesh
    var pickables = [];
    var mats = [];
    // collect first: the loop below adds helper meshes (outline, glow shells) as children
    var srcMeshes = [];
    model.traverse(function (o) { if (o.isMesh) srcMeshes.push(o); });
    srcMeshes.forEach(function (o) {
      var pn = parseNode(o), g = pn.group;
      var isBody = g === 'body';
      var m = pn.fabric
        ? new THREE.MeshStandardMaterial({ color: FABRIC.color, roughness: FABRIC.rough, metalness: 0 })
        : new THREE.MeshPhysicalMaterial({ color: LOOK.base.color, roughness: LOOK.base.rough, metalness: LOOK.base.metal, clearcoat: 0.3, clearcoatRoughness: 0.45 });
      m.userData = { group: g, isBody: isBody, fabric: pn.fabric, tColor: new THREE.Color(), tEm: new THREE.Color(), tEi: 0, tRough: 0.5, tMetal: 0.1, tRim: 0, rim: 0, tBloom: 0, bloom: 0 };
      addSurface(m, !pn.fabric && !!(o.geometry && o.geometry.getAttribute('_edge')), pn.fabric ? FABRIC.color : BODY_COLOR);
      o.material = m;
      o.userData.group = g;
      mats.push(m);
      pickables.push(o);
      if (!isBody) {
        if (!meshes[g] || !pn.fabric) meshes[g] = o;
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
        if (u.fabric) L = (L === LOOK.base || L === LOOK.body) ? FABRIC : (L === LOOK.lit1 ? FABRIC_LIT1 : FABRIC_LIT);
        u.tColor.setHex(L.color); u.tEm.setHex(L.emissive); u.tEi = L.ei; u.tRough = L.rough; u.tMetal = L.metal; u.tRim = L.rim; u.tBloom = L.bloom;
        if (snap) { m.color.copy(u.tColor); m.emissive.copy(u.tEm); m.emissiveIntensity = u.tEi; m.roughness = u.tRough; m.metalness = u.tMetal; u.rim = u.tRim; u.bloom = u.tBloom; }
      });
      if (snap) syncGlow();
      // the old back-face outline is no longer shown (it read as a floating shell); selection = stronger glow
      Object.keys(outlines).forEach(function (g) { outlines[g].visible = false; });
    }
    function syncGlow() {
      mats.forEach(function (m) { m.userData.uni.uRim.value = m.userData.rim; });
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
        u.rim += (u.tRim - u.rim) * k; u.bloom += (u.tBloom - u.bloom) * k;
        if (Math.abs(u.tEi - m.emissiveIntensity) > 0.002 || Math.abs(m.color.r - u.tColor.r) > 0.002 || Math.abs(u.tBloom - u.bloom) > 0.003 || Math.abs(u.tRim - u.rim) > 0.003) moving = true;
      });
      syncGlow();
      var tgt = 0;
      outlineMat.uniforms.uOpacity.value += (tgt - outlineMat.uniforms.uOpacity.value) * k;
      if (Math.abs(tgt - outlineMat.uniforms.uOpacity.value) > 0.005) moving = true;
      if (!moving) fading = 0;
      return moving;
    }
    setTargets(true);
    outlineMat.uniforms.uOpacity.value = 0;

    // ---- selective bloom: lit groups only, rendered small, blurred, added over the frame ----
    // The mask pass draws every mesh (unlit ones black, so they still occlude) at 1/4 resolution.
    var glowCol = new THREE.Color(GLOW);
    var black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    var maskMats = srcMeshes.map(function () { return new THREE.MeshBasicMaterial({ color: 0x000000 }); });
    var rtOpts = { type: THREE.HalfFloatType, depthBuffer: true };
    var rtA = new THREE.WebGLRenderTarget(4, 4, rtOpts), rtB = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    var fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new THREE.Scene();
    var fsVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    var blurMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: fsVS, depthTest: false, depthWrite: false,
      fragmentShader: 'uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;' +
        'void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.2270;' +
        ' c += (texture2D(tSrc, vUv + uDir * 1.3846).rgb + texture2D(tSrc, vUv - uDir * 1.3846).rgb) * 0.3162;' +
        ' c += (texture2D(tSrc, vUv + uDir * 3.2308).rgb + texture2D(tSrc, vUv - uDir * 3.2308).rgb) * 0.0703;' +
        ' gl_FragColor = vec4(c, 1.0); }'
    });
    var compMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uStr: { value: 1.0 } },
      vertexShader: fsVS, depthTest: false, depthWrite: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
      fragmentShader: 'uniform sampler2D tSrc; uniform float uStr; varying vec2 vUv;' +
        'void main(){ vec3 c = texture2D(tSrc, vUv).rgb * uStr; float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0); gl_FragColor = vec4(c, a); }'
    });
    var fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
    function sizeBloom(w, h) {
      var pr = renderer.getPixelRatio();
      var bw = Math.max(32, Math.round(w * pr / 4)), bh = Math.max(32, Math.round(h * pr / 4));
      rtA.setSize(bw, bh); rtB.setSize(bw, bh);
    }
    function anyBloom() { for (var i = 0; i < mats.length; i++) if (mats[i].userData.bloom > 0.01) return true; return false; }
    function renderFrame() {
      renderer.render(scene, camera);
      if (!anyBloom()) return;
      glowCol.setHex(GLOW);
      var saved = srcMeshes.map(function (o) { return o.material; });
      srcMeshes.forEach(function (o, i) {
        var b = o.material.userData.bloom || 0;
        if (b > 0.01) { maskMats[i].color.copy(glowCol).multiplyScalar(b); o.material = maskMats[i]; } else o.material = black;
      });
      var shadowVis = shadow.visible; shadow.visible = false;
      renderer.setRenderTarget(rtA); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      srcMeshes.forEach(function (o, i) { o.material = saved[i]; });
      shadow.visible = shadowVis;
      fsQuad.material = blurMat;
      [[1, 0, 1], [0, 1, 1], [1, 0, 2.2], [0, 1, 2.2]].forEach(function (p, i) {
        var src = i % 2 ? rtB : rtA, dst = i % 2 ? rtA : rtB;
        blurMat.uniforms.tSrc.value = src.texture; blurMat.uniforms.uDir.value.set(p[0] * p[2] / rtA.width, p[1] * p[2] / rtA.height);
        renderer.setRenderTarget(dst); renderer.render(fsScene, fsCam);
      });
      renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0);
      fsQuad.material = compMat; compMat.uniforms.tSrc.value = rtA.texture; compMat.uniforms.uStr.value = 1.0;
      var ac = renderer.autoClear; renderer.autoClear = false; renderer.render(fsScene, fsCam); renderer.autoClear = ac;
    }

    // ---- sizing ----
    var width = 1, height = 1;
    function resize() {
      var r = container.getBoundingClientRect();
      width = Math.max(1, Math.round(r.width)); height = Math.max(1, Math.round(r.height));
      renderer.setSize(width, height, false);
      sizeBloom(width, height);
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
        renderFrame();
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

    var runtime = {
      recolor: function () { setTargets(false); fading = 1; kick(); },
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
        rtA.dispose(); rtB.dispose(); blurMat.dispose(); compMat.dispose(); black.dispose(); maskMats.forEach(function (x) { x.dispose(); });
        var li = live.indexOf(runtime); if (li >= 0) live.splice(li, 1);
        outlineMat.dispose(); shadowMat.dispose(); shadowTex.dispose(); shadow.geometry.dispose();
        // geometry is shared with the cached template: do not dispose it here
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
    live.push(runtime);
    return runtime;
  }

  window.Body3D = {
    // Change the glow colour of lit muscles in every viewer (sRGB hex, e.g. 0x8c7cff or '#8c7cff').
    setGlowColor: function (hex) {
      GLOW = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : (+hex | 0);
      makeLook(); makeFabricLit(); live.forEach(function (r) { r.recolor(); });
    },
    mount: mount,
    preload: function () { return loadModel().then(function () {}); },
    groups: GROUPS.slice(),
    version: '1.0.0'
  };
})();
