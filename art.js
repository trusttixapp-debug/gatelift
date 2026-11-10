/* GATELIFT art: rank badges (E → Monarch) and Glint, the System's mascot. Pure SVG strings, no assets.
   Works in the page (window.ART) and in node (module.exports) so icons and previews render from the same source. */
(function(root){
let uid=0;
const P=(x,y)=>`${x.toFixed(1)} ${y.toFixed(1)}`;
const hex=(cx,cy,r)=>Array.from({length:6},(_,i)=>{const a=Math.PI/180*(60*i-90);return[cx+r*Math.cos(a),cy+r*Math.sin(a)]});
const poly=pts=>'M'+pts.map(p=>P(p[0],p[1])).join('L')+'Z';
const lin=(id,c,x2=1,y2=1)=>`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${c.map((s,i)=>`<stop offset="${i/(c.length-1)}" stop-color="${s}"/>`).join('')}</linearGradient>`;

/* Rank emblems. The frame shape climbs with you (ring, hexagon, shield), metal gets richer, wings and a crown arrive at the top.
   metal = frame and front feathers, gem = the stone and back feathers, wing2 = feathers behind the metal ones. */
const TIERS={
  E: {tier:0,shape:'ring', metal:['#F1F3F7','#A3ABB9','#4A515E','#23272F'],gem:['#B9C3D3','#5D687C','#1D2230']},
  D: {tier:1,shape:'ring', metal:['#FFE6C4','#D08A4C','#6A3514','#2E1406'],gem:['#FFC27A','#C4601E','#401404']},
  C: {tier:2,shape:'hex',  metal:['#FFFFFF','#CDD5E2','#66738A','#2A3242'],gem:['#E2F6FF','#5BB9EC','#0F3E60']},
  B: {tier:3,shape:'hex',  metal:['#FFF4C9','#DDAE40','#6E4A08','#2E1E02'],gem:['#C2FFE0','#17B877','#033F26'],wing2:['#9DF5CC','#14A86B','#04402A']},
  A: {tier:4,shape:'shield',metal:['#F5F9FF','#A9BEDF','#33476F','#141E36'],gem:['#C9DEFF','#2F6BFF','#061A5E'],wing2:['#9FC1FF','#2F6BFF','#0A2470']},
  S: {tier:5,shape:'shield',metal:['#FFF8D8','#F3C23E','#7D4C05','#331E00'],gem:['#FFCACA','#E3263F','#540512'],wing2:['#FFE7A0','#E8A320','#6B3C00']},
  SS:{tier:6,shape:'shield',metal:['#FFE9A8','#C9952A','#3E2705','#120B00'],gem:['#FFB7C0','#FF2B4A','#46000E'],wing2:['#FF8A97','#E0102E','#4A0010'],glow:'#FF3654'},
  M: {tier:7,shape:'shield',metal:['#FFF4D0','#E7B84A','#6B4306','#281700'],gem:['#F1DEFF','#9A4DFF','#25065E'],wing2:['#D7B6FF','#8B3DFF','#2A0A6E'],glow:'#A66BFF'}
};
const shieldPts=(cx,cy,r)=>[[cx,cy-r],[cx+r*.9,cy-r*.52],[cx+r*.82,cy+r*.42],[cx,cy+r*1.02],[cx-r*.82,cy+r*.42],[cx-r*.9,cy-r*.52]];
const framePath=(t,cx,cy,r)=>t.shape==='ring'
  ?`M${P(cx-r,cy)}A${r} ${r} 0 1 0 ${P(cx+r,cy)}A${r} ${r} 0 1 0 ${P(cx-r,cy)}Z`
  :poly(t.shape==='hex'?hex(cx,cy,r):shieldPts(cx,cy,r));
const framePts=(t,cx,cy,r)=>t.shape==='ring'?Array.from({length:8},(_,i)=>{const a=Math.PI/4*i-Math.PI/2;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]})
  :t.shape==='hex'?hex(cx,cy,r):shieldPts(cx,cy,r);
/* polished metal: bright, body, a dark band, a second highlight, then shadow */
const metalGrad=(id,m,flip)=>`<linearGradient id="${id}" x1="${flip?1:0}" y1="${flip?1:0}" x2="${flip?0:1}" y2="${flip?0:1}">
  <stop offset="0" stop-color="${m[0]}"/><stop offset=".28" stop-color="${m[1]}"/><stop offset=".5" stop-color="${m[2]}"/>
  <stop offset=".64" stop-color="${m[0]}" stop-opacity=".95"/><stop offset=".8" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[3]}"/></linearGradient>`;

function wingSide(t,cx,cy,id){
  const n=[0,0,0,3,4,5,5,6][t.tier]; if(!n)return'';
  const long=[0,0,0,62,76,92,92,104][t.tier],flame=t.tier===6,out=[];
  const blade=(bx,by,a,len,w,fill,stroke,sw)=>{
    const dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx,tx=bx+len*dx,ty=by+len*dy,mx=bx+len*.55*dx,my=by+len*.55*dy;
    const notch=flame?`L${P(tx-dx*16+nx*7,ty-dy*16+ny*7)}L${P(tx-dx*11+nx*2,ty-dy*11+ny*2)}`:'';
    return `<path d="M${P(bx-nx*w/2,by-ny*w/2)}Q${P(mx-nx*w*.95,my-ny*w*.95)} ${P(tx,ty)}${notch}Q${P(mx+nx*w*.3,my+ny*w*.3)} ${P(bx+nx*w/2,by+ny*w/2)}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <path d="M${P(bx+dx*8,by+dy*8)}Q${P(mx-nx*w*.25,my-ny*w*.25)} ${P(tx-dx*14,ty-dy*14)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/>`};
  for(let i=n-1;i>=0;i--){const bx=cx+44,by=cy-26+i*14,a=(-52+i*17)*Math.PI/180,len=long-i*8;
    out.push(blade(bx-4,by+2,a-.12,len+14,19-i,`url(#${id}w2)`,t.wing2[2],1.6));}
  for(let i=n-1;i>=0;i--){const bx=cx+46,by=cy-24+i*14,a=(-46+i*17)*Math.PI/180,len=long-10-i*8;
    out.push(blade(bx,by,a,len,16-i,`url(#${id}wm)`,t.metal[3],1.8));}
  return out.join('');
}

function badge(k,size=64){
  const t=TIERS[k]||TIERS.E,id='rb'+(++uid),cx=120,cy=t.tier>=5?126:120,R=t.shape==='shield'?66:t.tier>=3?64:74;
  const side=wingSide(t,cx,cy,id);
  const wings=side?`<g>${side}</g><g transform="translate(${2*cx} 0) scale(-1 1)">${side}</g>`:'';
  const outer=framePath(t,cx,cy,R),rim=framePath(t,cx,cy,R*.88),recess=framePath(t,cx,cy,R*.78),stone=framePath(t,cx,cy,R*.6);
  const sp=framePts(t,cx,cy,R*.6);
  const facets=sp.map((p,i)=>{const q=sp[(i+1)%sp.length];const o=[.42,.18,-.08,-.3,-.18,.06,.24,.3][i%8];
    return `<path d="M${P(cx,cy)}L${P(...p)}L${P(...q)}Z" fill="${o>0?'#fff':'#000'}" fill-opacity="${Math.abs(o)}"/>`}).join('');
  /* studs on the ring for D, side brackets with gems from C up */
  const studs=t.tier===1?Array.from({length:8},(_,i)=>{const a=Math.PI/4*i;return`<circle cx="${cx+R*.94*Math.cos(a)}" cy="${cy+R*.94*Math.sin(a)}" r="4.2" fill="url(#${id}m)" stroke="${t.metal[3]}" stroke-width="1.2"/>`}).join(''):'';
  const brackets=t.tier>=2?[1,-1].map(s=>`<path d="M${P(cx+s*R*.86,cy-22)}L${P(cx+s*(R+14),cy-14)}L${P(cx+s*(R+14),cy+14)}L${P(cx+s*R*.86,cy+22)}Z" fill="url(#${id}m)" stroke="${t.metal[3]}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M${P(cx+s*(R+5),cy-7)}L${P(cx+s*(R+10),cy)}L${P(cx+s*(R+5),cy+7)}L${P(cx+s*R,cy)}Z" fill="url(#${id}g)" stroke="${t.metal[3]}" stroke-width="1"/>`).join(''):'';
  const top=t.tier===4?`<path d="M${P(cx,cy-R-30)}L${P(cx+13,cy-R-4)}L${P(cx,cy-R+10)}L${P(cx-13,cy-R-4)}Z" fill="url(#${id}m)" stroke="${t.metal[3]}" stroke-width="2" stroke-linejoin="round"/><path d="M${P(cx,cy-R-20)}L${P(cx+6,cy-R-5)}L${P(cx,cy-R+2)}L${P(cx-6,cy-R-5)}Z" fill="url(#${id}g)"/>`
    :t.tier===5||t.tier===7?(()=>{const y=cy-R+4,h=t.tier===7?40:32;
      return `<path d="M${P(cx-30,y)}L${P(cx-38,y-h)}L${P(cx-17,y-h*.5)}L${P(cx,y-h-10)}L${P(cx+17,y-h*.5)}L${P(cx+38,y-h)}L${P(cx+30,y)}Z" fill="url(#${id}m)" stroke="${t.metal[3]}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M${P(cx-28,y-4)}L${P(cx+28,y-4)}" stroke="${t.metal[3]}" stroke-width="2"/>
      ${[[cx-38,y-h,5],[cx,y-h-10,6.5],[cx+38,y-h,5],[cx-14,y-9,3.6],[cx+14,y-9,3.6]].map(([x,yy,r])=>`<circle cx="${x}" cy="${yy}" r="${r}" fill="url(#${id}g)" stroke="${t.metal[3]}" stroke-width="1.4"/><circle cx="${x-r*.35}" cy="${yy-r*.35}" r="${r*.3}" fill="#fff" opacity=".8"/>`).join('')}`})()
    :t.tier===6?[1,-1].map(s=>`<path d="M${P(cx+s*22,cy-R+8)}C${P(cx+s*36,cy-R-20)} ${P(cx+s*56,cy-R-30)} ${P(cx+s*74,cy-R-58)}C${P(cx+s*66,cy-R-24)} ${P(cx+s*52,cy-R-6)} ${P(cx+s*40,cy-R+20)}Z" fill="url(#${id}m)" stroke="${t.metal[3]}" stroke-width="2" stroke-linejoin="round"/>`).join('')
      +`<path d="M${P(cx,cy-R-22)}L${P(cx+10,cy-R)}L${P(cx,cy-R+10)}L${P(cx-10,cy-R)}Z" fill="url(#${id}g)" stroke="${t.metal[3]}" stroke-width="1.6"/>`:'';
  const tip=t.tier>=5?`<path d="M${P(cx-22,cy+R*.92)}L${P(cx,cy+R*1.5)}L${P(cx+22,cy+R*.92)}Z" fill="url(#${id}m)" stroke="${t.metal[3]}" stroke-width="2" stroke-linejoin="round"/><path d="M${P(cx-8,cy+R*1.06)}L${P(cx,cy+R*1.3)}L${P(cx+8,cy+R*1.06)}Z" fill="url(#${id}g)"/>`:'';
  const aura=t.glow?`<circle cx="${cx}" cy="${cy}" r="118" fill="url(#${id}a)"/>`:'';
  const glow=t.glow?`<path d="${outer}" fill="none" stroke="${t.glow}" stroke-width="9" opacity=".7" filter="url(#${id}b)"/>`:'';
  const mark=k==='M'
    ?`<path d="M${P(cx-22,cy+14)}L${P(cx-27,cy-14)}L${P(cx-11,cy-1)}L${P(cx,cy-22)}L${P(cx+11,cy-1)}L${P(cx+27,cy-14)}L${P(cx+22,cy+14)}Z" fill="url(#${id}l)" stroke="${t.gem[2]}" stroke-width="3" stroke-linejoin="round"/>`
    :`<text x="${cx}" y="${cy+(k.length>1?15:19)}" text-anchor="middle" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="${k.length>1?40:54}" fill="url(#${id}l)" stroke="${t.gem[2]}" stroke-width="5" paint-order="stroke" letter-spacing="-1">${k}</text>`;
  return `<svg class="badge" width="${size}" height="${size}" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${k==='M'?'Monarch':k+'-Rank'} emblem">
  <defs>${metalGrad(id+'m',t.metal)}${metalGrad(id+'r',t.metal,1)}${metalGrad(id+'wm',t.metal)}
    ${t.wing2?`<linearGradient id="${id}w2" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="${t.wing2[0]}"/><stop offset=".5" stop-color="${t.wing2[1]}"/><stop offset="1" stop-color="${t.wing2[2]}"/></linearGradient>`:''}
    <radialGradient id="${id}g" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="${t.gem[0]}"/><stop offset=".45" stop-color="${t.gem[1]}"/><stop offset="1" stop-color="${t.gem[2]}"/></radialGradient>
    <radialGradient id="${id}d" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="${t.gem[2]}"/><stop offset="1" stop-color="#05060A"/></radialGradient>
    <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="${t.metal[0]}"/><stop offset="1" stop-color="${t.metal[1]}"/></linearGradient>
    <radialGradient id="${id}a"><stop offset="0" stop-color="${t.glow||'#fff'}" stop-opacity=".5"/><stop offset="1" stop-color="${t.glow||'#fff'}" stop-opacity="0"/></radialGradient>
    <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs>
  ${aura}${wings}${glow}${tip}${brackets}
  <path d="${outer}" fill="url(#${id}m)" stroke="${t.metal[3]}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="${rim}" fill="url(#${id}r)" stroke="${t.metal[3]}" stroke-opacity=".6" stroke-width="1.5"/>
  <path d="${recess}" fill="url(#${id}d)"/>
  <path d="${stone}" fill="url(#${id}g)"/>${facets}
  <path d="${stone}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.6"/>
  <path d="M${P(cx-R*.42,cy-R*.3)}Q${P(cx-R*.1,cy-R*.56)} ${P(cx+R*.24,cy-R*.46)}" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>
  ${studs}${top}${mark}
  <path d="M${P(cx+R*.6,cy-R*.78)}l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff" opacity=".9"/></svg>`;
}

/* Glint: a shard of the System that hatched to keep your record. Poses: idle, wave, cheer, write, sleep. */
function mascot(pose='idle',size=120){
  const id='gl'+(++uid);
  const happy=pose==='cheer'||pose==='wave', closed=pose==='sleep';
  const hands={idle:[[44,152],[156,152]],wave:[[44,152],[170,78]],cheer:[[30,74],[170,74]],write:[[60,150],[138,140]],sleep:[[52,160],[148,160]]}[pose]||[[44,152],[156,152]];
  const eyes=happy
    ? `<path d="M68 112Q80 96 92 112M108 112Q120 96 132 112" fill="none" stroke="#071233" stroke-width="7" stroke-linecap="round"/>`
    : closed
    ? `<path d="M68 108Q80 116 92 108M108 108Q120 116 132 108" fill="none" stroke="#071233" stroke-width="6" stroke-linecap="round"/>`
    : `<ellipse cx="80" cy="106" rx="10" ry="13" fill="#071233"/><ellipse cx="120" cy="106" rx="10" ry="13" fill="#071233"/>
       <circle cx="84" cy="100" r="4" fill="#fff"/><circle cx="124" cy="100" r="4" fill="#fff"/><circle cx="77" cy="112" r="1.8" fill="#fff" opacity=".8"/><circle cx="117" cy="112" r="1.8" fill="#fff" opacity=".8"/>`;
  const mouth=happy?`<path d="M88 124Q100 138 112 124Z" fill="#071233"/><path d="M93 129Q100 134 107 129" fill="none" stroke="#FF8FA3" stroke-width="3" stroke-linecap="round"/>`
    :closed?`<path d="M95 127Q100 130 105 127" fill="none" stroke="#071233" stroke-width="3.5" stroke-linecap="round"/>`
    :`<path d="M91 125Q100 132 109 125" fill="none" stroke="#071233" stroke-width="4" stroke-linecap="round"/>`;
  const extra=pose==='wave'?`<path d="M184 62q8 8 4 20M190 52q14 12 8 34" fill="none" stroke="#8FB4FF" stroke-width="3.5" stroke-linecap="round"/>`
    :pose==='cheer'?`<path d="M18 50l6 8M182 50l-6 8M14 76h10M186 76h-10" stroke="#8FB4FF" stroke-width="4" stroke-linecap="round"/>`
    :pose==='write'?`<rect x="112" y="128" width="40" height="50" rx="6" fill="#fff" stroke="#0D1E52" stroke-width="3" transform="rotate(10 132 153)"/><path d="M122 144h20M120 154h20M118 164h14" stroke="#8FB4FF" stroke-width="3" stroke-linecap="round" transform="rotate(10 132 153)"/><path d="M62 150l18-26" stroke="#0D1E52" stroke-width="5" stroke-linecap="round"/>`
    :pose==='sleep'?`<text x="150" y="58" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="22" fill="#8FB4FF">z</text><text x="166" y="38" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="16" fill="#8FB4FF">z</text>`:'';
  return `<svg class="glint" width="${size}" height="${size*1.1}" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Glint">
  <defs>${lin(id+'b',['#5B95FF','#1A4BFF','#0A2FD6'],.4,1)}${lin(id+'v',['#FFFFFF','#DCE7FF'],0,1)}
    <radialGradient id="${id}s"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#8FB4FF" stop-opacity=".7"/><stop offset="1" stop-color="#3D7BFF" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="100" cy="206" rx="48" ry="8" fill="#071233" opacity=".16"/>
  <circle cx="100" cy="24" r="20" fill="url(#${id}s)"/>
  <path d="M100 8l9 16-9 16-9-16z" fill="#fff" stroke="#3D7BFF" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M40 96 16 78l10 34z M160 96l24-18-10 34z" fill="#0A2FD6" stroke="#071233" stroke-opacity=".25" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="78" cy="190" rx="18" ry="10" fill="#0A2FD6"/><ellipse cx="122" cy="190" rx="18" ry="10" fill="#0A2FD6"/>
  <path d="M100 44C152 44 170 74 170 114C170 160 142 188 100 188C58 188 30 160 30 114C30 74 48 44 100 44Z" fill="url(#${id}b)"/>
  <path d="M60 62C72 52 88 48 100 48" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
  <path d="M70 170Q100 182 130 170" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="10" stroke-linecap="round"/>
  <rect x="50" y="78" width="100" height="64" rx="32" fill="url(#${id}v)" stroke="#071233" stroke-opacity=".18" stroke-width="2"/>
  <path d="M50 92h100" stroke="#3D7BFF" stroke-opacity=".12" stroke-width="2"/>
  ${eyes}<ellipse cx="66" cy="126" rx="7" ry="4" fill="#8FB4FF" opacity=".7"/><ellipse cx="134" cy="126" rx="7" ry="4" fill="#8FB4FF" opacity=".7"/>${mouth}
  ${extra}${hands.map(h=>`<circle cx="${h[0]}" cy="${h[1]}" r="14" fill="url(#${id}b)" stroke="#071233" stroke-opacity=".2" stroke-width="2"/><circle cx="${h[0]-4}" cy="${h[1]-5}" r="4" fill="#fff" opacity=".45"/>`).join('')}
  </svg>`;
}

function shade(pose='idle',size=120){
  /* Shade: a shadow soldier the System lends every Hunter. Hard silhouette, cel-cut rim light, lightning eyes.
     Poses change the eyes and the aura only: idle, focus, smug, rage, rest, wary. */
  const id='sh'+(++uid);
  const head='M110 72C100 62 86 46 64 12C70 44 60 62 50 80C38 104 42 134 62 154L86 178L110 198L134 178L158 154C178 134 182 104 170 80C160 62 150 44 156 12C134 46 120 62 110 72Z';
  const blades='M50 100 12 90 44 124ZM170 100l38-10-32 34Z';
  const fangs='M96 186 101 212 108 192ZM124 186l-5 26-7-20Z';
  const tail='M94 194C74 214 96 224 82 250C98 240 104 228 100 214C108 228 118 240 138 250C122 230 136 214 126 194Z';
  const silhouette=`<path d="${tail}"/><path d="${blades}"/><path d="${head}"/><path d="${fangs}"/>`;
  /* cel shading: the right side of the face falls into a slightly lifted navy plane */
  const plane='M110 72C120 62 134 46 156 12C150 44 160 62 170 80C182 104 178 134 158 154L134 178L110 198Z';
  const E={
    idle:'M58 108Q82 106 101 122Q93 135 76 133Q63 127 58 108Z',
    focus:'M58 112Q84 112 101 125Q90 131 76 130Q63 126 58 112Z',
    smug:'M63 121 101 124Q92 134 78 133Q66 129 63 121Z',
    rage:'M56 104Q84 104 102 124Q92 136 75 134Q60 127 56 104Z',
    wary:'M60 110Q82 110 100 122Q93 134 77 132Q64 127 60 110Z'
  };
  const eye=d=>`<path d="${d}" fill="url(#${id}e)"/><path d="${d}" fill="url(#${id}e)" transform="translate(220 0) scale(-1 1)"/>`;
  const veins=(o,big)=>`<g fill="none" stroke="#5AA2FF" stroke-width="${big?1.8:1.3}" stroke-linecap="round" stroke-linejoin="round" opacity="${o}" filter="url(#${id}g)">
    <path d="M58 108 48 100 42 103 30 92M60 114 46 116 40 124${big?' M50 100 46 88 38 84':''}"/>
    <path d="M162 108l10-8 6 3 12-11M160 114l14 2 6 8${big?' M170 100l4-12 8-4':''}"/></g>`;
  let eyes;
  if(pose==='rest')eyes=`<path d="M64 124Q82 131 99 126M156 124Q138 131 121 126" fill="none" stroke="#CFE4FF" stroke-width="3.2" stroke-linecap="round"/>`;
  else if(pose==='wary')eyes=`<path d="${E.wary}" fill="url(#${id}e)"/><path d="${E.focus}" fill="url(#${id}e)" transform="translate(220 0) scale(-1 1)"/>${veins(.5)}`;
  else eyes=eye(E[pose]||E.idle)+veins(pose==='rage'?1:pose==='smug'?.35:.7,pose==='rage');
  const debris=[[34,52,8,20],[188,48,6,-15],[24,170,7,35],[196,160,9,-30],[176,214,5,12],[44,222,6,-22]]
    .map(([x,y,s,r])=>`<path d="M${x} ${y}l${s} ${s*.4}-${s*.5} ${s*1.3}z" fill="#0A0F22" stroke="#86B4FF" stroke-opacity=".35" stroke-width=".8" opacity=".7" transform="rotate(${r} ${x} ${y})"/>`).join('');
  const aura=pose==='rage'?.85:pose==='rest'?.25:.5;
  return `<svg class="shade" width="${size}" height="${size*260/220}" viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Shade">
  <defs><radialGradient id="${id}e" cx=".62" cy=".5" r=".7"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#EAF4FF"/><stop offset="1" stop-color="#6CB4FF"/></radialGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1124"/><stop offset="1" stop-color="#03050C"/></linearGradient>
    <filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="${id}r" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="4"/></filter></defs>
  ${debris}
  <g fill="none" stroke="#86B4FF" stroke-width="7" opacity="${aura}" filter="url(#${id}r)">${silhouette}</g>
  <g fill="#D6E4FF" stroke="#D6E4FF" stroke-width="3.4" stroke-linejoin="round" opacity=".9">${silhouette}</g>
  <g fill="url(#${id}f)">${silhouette}</g>
  <path d="${plane}" fill="#16213F" opacity=".55"/>
  <path d="M64 12C70 44 60 62 50 80C40 100 40 122 50 140" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>
  <g filter="url(#${id}g)" transform="translate(110 122) scale(1.22) translate(-110 -122)">${eyes}</g></svg>`;
}

const ART={badge,mascot,shade,TIERS};
if(typeof module!=='undefined'&&module.exports)module.exports=ART;else root.ART=ART;
})(typeof window!=='undefined'?window:this);
