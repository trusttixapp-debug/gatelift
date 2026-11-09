/* Packs the anatomy SVGs into ../figures.js. Run: node src-figures/build.js */
const fs=require('fs'),path=require('path');
const dir=__dirname;
const files={
  male:{front:'male_front_muscle_anatomy.svg',back:'male_back_muscle_anatomy.svg'},
  female:{front:'female_front_muscles_anatomy.svg',back:'female_back_muscles_anatomy.svg'},
};
const clean=src=>src
  .replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')
  .replace(/\s(class|stroke|stroke-width)="[^"]*"/g,'')
  .replace(/upper-trapzeius/g,'upper-trapezius').replace(/later-head-triceps/g,'lateral-head-triceps')
  .replace(/<g id="/g,'<g data-m="')
  .replace(/(\d+\.\d{2})\d+/g,'$1')
  .replace(/\s+/g,' ').replace(/> </g,'><').trim();
const out={};
for(const sex in files){out[sex]={};for(const side in files[sex])out[sex][side]=clean(fs.readFileSync(path.join(dir,files[sex][side]),'utf8'))}
const license=fs.readFileSync(path.join(dir,'LICENSE-muscle_mapper.txt'),'utf8').trim();
fs.writeFileSync(path.join(dir,'..','figures.js'),
`/* Anatomy figures from muscle_mapper (https://github.com/suryamolly/muscle_mapper), recoloured by BUILT.

${license}
*/
window.FIG=${JSON.stringify(out)};
`);
console.log('figures.js',fs.statSync(path.join(dir,'..','figures.js')).size,'bytes');
