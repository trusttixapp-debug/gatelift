/* Builds a single-file copy of the app for a private Claude link: node src-figures/artifact.js <out.html> */
const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
let s=fs.readFileSync(path.join(root,'index.html'),'utf8');
const fig=fs.readFileSync(path.join(root,'figures.js'),'utf8');
s=s.replace(/<!doctype html>\s*/i,'').replace(/<\/?html[^>]*>\s*/gi,'').replace(/<\/?head>\s*/gi,'').replace(/<\/?body>\s*/gi,'')
 .replace(/<meta charset[^>]*>\s*/i,'').replace(/<meta name="viewport"[^>]*>\s*/i,'')
 .replace(/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\s*/g,'')
 .replace('<script src="figures.js"></script>',()=>'<script>\n'+fig+'</script>');
/* title first so the viewer finds it */
const t=s.match(/<title>.*?<\/title>/)[0];s=t+'\n'+s.replace(t,'');
fs.writeFileSync(process.argv[2],s);console.log('wrote',process.argv[2],s.length,'bytes');
