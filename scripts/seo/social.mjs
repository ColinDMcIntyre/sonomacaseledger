import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {SITE_NAME} from './config.mjs';
import {setMeta} from './metadata.mjs';
export function socialMetadata(html,page,record,origin,title,description){
 for(const [key,value] of Object.entries({'og:type':record?'article':'website','og:site_name':SITE_NAME,'og:title':title,'og:description':description,'og:url':origin+page.path,'og:image':origin+'/assets/social-preview.png','og:image:width':'1200','og:image:height':'630','og:image:alt':'Sonoma Case Ledger archive emblem'}))html=setMeta(html,key,value,'property');
 for(const [key,value] of Object.entries({'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':origin+'/assets/social-preview.png','twitter:image:alt':'Sonoma Case Ledger archive emblem'}))html=setMeta(html,key,value);
 return html;
}
// Deterministic, dependency-free PNG: neutral archive emblem, no person or case claims.
export async function writeSocialImage(root){
 const width=1200,height=630,stride=width*3+1,raw=Buffer.alloc(stride*height);
 const rect=(x,y,w,h,c)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const p=yy*stride+1+xx*3;raw[p]=c[0];raw[p+1]=c[1];raw[p+2]=c[2];}};
 const navy=[22,42,54],paper=[245,243,238],gold=[183,149,93],muted=[200,201,191];
 rect(0,0,width,height,navy);rect(68,68,1064,494,gold);rect(72,72,1056,486,navy);
 rect(142,146,270,338,paper);rect(170,174,214,282,navy);
 // Three rules suggest a public record; the right side is a block-letter wordmark.
 for(let i=0;i<5;i++)rect(202,228+i*37,150-(i===4?45:0),7,gold);
 const font={S:['111','100','111','001','111'],O:['111','101','101','101','111'],N:['1001','1101','1011','1001','1001'],M:['10001','11011','10101','10001','10001'],A:['010','101','111','101','101'],C:['111','100','100','100','111'],E:['111','100','110','100','111'],L:['100','100','100','100','111'],D:['110','101','101','101','110'],G:['111','100','101','101','111'],R:['110','101','110','101','101']};
 const draw=(word,x,y,scale,color)=>{for(const ch of word){if(ch===' '){x+=scale*2;continue;}const glyph=font[ch];for(let j=0;j<glyph.length;j++)for(let i=0;i<glyph[j].length;i++)if(glyph[j][i]==='1')rect(x+i*scale,y+j*scale,scale,scale,color);x+=(glyph[0].length+1)*scale;}};
 draw('SONOMA',485,182,14,paper);draw('CASE LEDGER',485,285,12,paper);rect(485,390,500,3,gold);rect(485,420,330,7,muted);
 const crc32=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const name=Buffer.from(type),n=Buffer.alloc(4),crc=Buffer.alloc(4);n.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([n,name,data,crc]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 await writeFile(join(root,'assets/social-preview.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
