/* GATELIFT art: rank badges (E → Monarch) and Glint, the System's mascot. Pure SVG strings, no assets.
   Works in the page (window.ART) and in node (module.exports) so icons and previews render from the same source. */
(function(root){
let uid=0;
const P=(x,y)=>`${x.toFixed(1)} ${y.toFixed(1)}`;
const hex=(cx,cy,r)=>Array.from({length:6},(_,i)=>{const a=Math.PI/180*(60*i-90);return[cx+r*Math.cos(a),cy+r*Math.sin(a)]});
const poly=pts=>'M'+pts.map(p=>P(p[0],p[1])).join('L')+'Z';
const lin=(id,c,x2=1,y2=1)=>`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${c.map((s,i)=>`<stop offset="${i/(c.length-1)}" stop-color="${s}"/>`).join('')}</linearGradient>`;

/* metal = frame and wings, gem = the stone, tier drives ornament */
const TIERS={
  E:{metal:['#D5DAE3','#8A93A5','#454C5B'],gem:['#C9D1DE','#6C778B','#2E3442'],tier:0},
  D:{metal:['#F6D2A4','#C0844A','#5E3517'],gem:['#FFD08A','#E0862B','#6B3307'],tier:1},
  C:{metal:['#FFFFFF','#C7CFDC','#6B778C'],gem:['#FFFFFF','#BFD0EC','#55678A'],tier:2},
  B:{metal:['#D4FFF1','#3FD0A0','#0C5F47'],gem:['#C8FFEC','#1FC28D','#064F39'],tier:3},
  A:{metal:['#DDE9FF','#5B95FF','#13309A'],gem:['#D6E6FF','#3D7BFF','#0A2490'],tier:4},
  S:{metal:['#FFF5CC','#F5C43B','#8A560A'],gem:['#FFF8DD','#FFC92E','#9A5E06'],tier:5},
  SS:{metal:['#555B69','#1D2029','#06070A'],gem:['#FFC2C8','#FF3B4E','#6E0412'],tier:6,edge:'#FF4B5C'},
  M:{metal:['#5E4D86','#231A40','#090514'],gem:['#EBDDFF','#9061FF','#260B66'],tier:7,edge:'#B48CFF'}
};

function feathers(t,cx,cy,id){
  const n=[0,1,2,3,4,5,5,6][t.tier]; if(!n)return'';
  const long=t.tier>=5?94:t.tier>=3?84:62, out=[];
  for(let i=n-1;i>=0;i--){
    const bx=cx+38, by=cy-22+i*13, a=(-40+i*19)*Math.PI/180, len=long-i*9, w=17-i*1.6;
    const dx=Math.cos(a), dy=Math.sin(a), nx=-dy, ny=dx;
    const tx=bx+len*dx, ty=by+len*dy, mx=bx+len*.5*dx, my=by+len*.5*dy;
    const p0=[bx-nx*w/2,by-ny*w/2], p1=[bx+nx*w/2,by+ny*w/2];
    const sharp=t.tier>=6;                                   /* SS and Monarch get jagged, flame-cut feathers */
    const notch=sharp?`L${P(tx-dx*14+nx*5,ty-dy*14+ny*5)}L${P(tx-dx*10+nx*1,ty-dy*10+ny*1)}`:'';
    out.push(`<path d="M${P(...p0)}Q${P(mx-nx*w*.9,my-ny*w*.9)} ${P(tx,ty)}${notch}Q${P(mx+nx*w*.35,my+ny*w*.35)} ${P(...p1)}Z" fill="url(#${id}w)" stroke="${t.edge||t.metal[2]}" stroke-width="${sharp?2:2.4}" stroke-linejoin="round"/>`);
    out.push(`<path d="M${P(bx+dx*6,by+dy*6)}L${P(tx-dx*16,ty-dy*16)}" stroke="#fff" stroke-opacity="${sharp?.18:.4}" stroke-width="1.6" stroke-linecap="round"/>`);
  }
  const side=out.join('');
  return `<g>${side}</g><g transform="translate(${2*cx} 0) scale(-1 1)">${side}</g>`;
}

function badge(k,size=64){
  const t=TIERS[k]||TIERS.E, id='rb'+(++uid), cx=120, cy=104;
  const outer=hex(cx,cy,60), bevel=hex(cx,cy,51), gem=hex(cx,cy,45), core=hex(cx,cy,22);
  const facets=gem.map((p,i)=>{const q=gem[(i+1)%6];const o=[.34,.12,-.1,-.22,-.06,.2][i];
    return `<path d="M${P(cx,cy)}L${P(...p)}L${P(...q)}Z" fill="${o>0?'#fff':'#000'}" fill-opacity="${Math.abs(o)}"/>`}).join('');
  const glow=t.edge?`<path d="${poly(outer)}" fill="none" stroke="${t.edge}" stroke-width="7" opacity=".55" filter="url(#${id}b)"/>`:'';
  const aura=t.tier===7?`<circle cx="${cx}" cy="${cy}" r="104" fill="url(#${id}a)"/>`:'';
  const horns=t.tier===6?[1,-1].map(s=>`<path d="M${P(cx+s*26,cy-50)}C${P(cx+s*40,cy-74)} ${P(cx+s*58,cy-86)} ${P(cx+s*72,cy-112)}C${P(cx+s*60,cy-82)} ${P(cx+s*50,cy-62)} ${P(cx+s*40,cy-40)}Z" fill="url(#${id}m)" stroke="${t.edge}" stroke-width="2" stroke-linejoin="round"/>`).join(''):'';
  const crown=t.tier===5||t.tier===7?`<path d="M${P(cx-28,cy-56)}L${P(cx-34,cy-90)}L${P(cx-15,cy-74)}L${P(cx,cy-100)}L${P(cx+15,cy-74)}L${P(cx+34,cy-90)}L${P(cx+28,cy-56)}Z" fill="url(#${id}m)" stroke="${t.edge||t.metal[2]}" stroke-width="2.4" stroke-linejoin="round"/>
    ${[[cx-34,cy-90],[cx,cy-100],[cx+34,cy-90]].map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="url(#${id}g)" stroke="${t.edge||t.metal[2]}" stroke-width="1.5"/>`).join('')}`:'';
  const spike=t.tier===4?`<path d="M${P(cx,cy-92)}L${P(cx+11,cy-70)}L${P(cx,cy-56)}L${P(cx-11,cy-70)}Z" fill="url(#${id}m)" stroke="${t.metal[2]}" stroke-width="2.4" stroke-linejoin="round"/>`:'';
  const ribbon=t.tier>=2?`<path d="M${P(cx-54,cy+46)}L${P(cx-72,cy+50)}L${P(cx-62,cy+62)}L${P(cx-70,cy+76)}L${P(cx-46,cy+70)}Z M${P(cx+54,cy+46)}L${P(cx+72,cy+50)}L${P(cx+62,cy+62)}L${P(cx+70,cy+76)}L${P(cx+46,cy+70)}Z" fill="${t.metal[2]}" stroke="${t.edge||t.metal[2]}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M${P(cx-54,cy+46)}L${P(cx+54,cy+46)}L${P(cx+48,cy+72)}L${P(cx-48,cy+72)}Z" fill="url(#${id}g)" stroke="${t.edge||t.metal[2]}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M${P(cx-50,cy+50)}L${P(cx+50,cy+50)}" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>`:'';
  const mark=k==='M'
    ? `<path d="M${P(cx-20,cy+12)}L${P(cx-24,cy-14)}L${P(cx-10,cy-2)}L${P(cx,cy-20)}L${P(cx+10,cy-2)}L${P(cx+24,cy-14)}L${P(cx+20,cy+12)}Z" fill="#fff" stroke="${t.gem[2]}" stroke-width="3" stroke-linejoin="round"/>`
    : `<text x="${cx}" y="${cy+(k.length>1?13:16)}" text-anchor="middle" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="${k.length>1?36:46}" fill="#fff" stroke="${t.gem[2]}" stroke-width="4" paint-order="stroke" letter-spacing="-1">${k}</text>`;
  return `<svg class="badge" width="${size}" height="${size}" viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${k==='M'?'Monarch':k+'-Rank'} badge">
  <defs>${lin(id+'m',t.metal)}${lin(id+'w',[t.metal[0],t.metal[1],t.metal[2]],1,.3)}${lin(id+'g',t.gem,.3,1)}
    <radialGradient id="${id}a"><stop offset="0" stop-color="${t.gem[1]}" stop-opacity=".55"/><stop offset="1" stop-color="${t.gem[1]}" stop-opacity="0"/></radialGradient>
    <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter></defs>
  ${aura}${feathers(t,cx,cy,id)}${horns}${glow}
  <path d="${poly(outer)}" fill="url(#${id}m)" stroke="${t.edge||t.metal[2]}" stroke-width="3" stroke-linejoin="round"/>
  <path d="${poly(bevel)}" fill="${t.metal[2]}"/>
  <path d="${poly(gem)}" fill="url(#${id}g)"/>${facets}
  <path d="${poly(core)}" fill="#fff" fill-opacity=".16"/>
  <path d="${poly(gem)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>
  ${spike}${crown}${ribbon}${mark}</svg>`;
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
