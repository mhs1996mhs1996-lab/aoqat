/* Embedded Aoqat Navy Numerals subset of DejaVu Serif.
Copyright: Copyright (c) 2003 by Bitstream, Inc. All Rights Reserved.
 Bitstream Vera is a trademark of Bitstream, Inc.
 DejaVu changes are in public domain.
License: bitstream-vera
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of the fonts accompanying this license ("Fonts") and associated
 documentation files (the "Font Software"), to reproduce and distribute the
 Font Software, including without limitation the rights to use, copy, merge,
 publish, distribute, and/or sell copies of the Font Software, and to permit
 persons to whom the Font Software is furnished to do so, subject to the
 following conditions:
 .
 The above copyright and trademark notices and this permission notice shall
 be included in all copies of one or more of the Font Software typefaces.
 .
 The Font Software may be modified, altered, or added to, and in particular
 the designs of glyphs or characters in the Fonts may be modified and
 additional glyphs or characters may be added to the Fonts, only if the fonts
 are renamed to names not containing either the words "Bitstream" or the word
 "Vera".
 .
 This License becomes null and void to the extent applicable to Fonts or Font
 Software that has been modified and is distributed under the "Bitstream
 Vera" names.
 .
 The Font Software may be sold as part of a larger software package but no
 copy of one or more of the Font Software typefaces may be sold by itself.
 .
 THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT,
 TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL BITSTREAM OR THE GNOME
 FOUNDATION BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING
 ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE
 FONT SOFTWARE.
 .
 Except as contained in this notice, the names of Gnome, the Gnome
 Foundation, and Bitstream Inc., shall not be used in advertising or
 otherwise to promote the sale, use or other dealings in this Font Software
 without prior written authorization from the Gnome Foundation or Bitstream
 Inc., respectively. For further information, contact: fonts at gnome dot
 org.

*/
(function(){'use strict';const C=window.AoqatMonthlyCalendarsCore;if(!C)return;
 let loaded;function font(){if(!loaded)loaded=(async()=>{const f=new FontFace('AoqatCalendar','url("/assets/fonts/amiri-quran.ttf")');await f.load();document.fonts.add(f);const numerals=new FontFace('AoqatNavyNumerals','url(data:font/woff;base64,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)',{unicodeRange:'U+0030-003A'});await numerals.load();document.fonts.add(numerals);await document.fonts.ready;})().catch(e=>{loaded=null;throw e;});return loaded;}
 async function render(model,raw,scale=1){
  await font();if(raw?.design==='navy-gold')return renderNavy(model,C.normalize(raw),scale);if(['iraqi-paper','minimal-modern','islamic-corners'].includes(raw?.design))return renderReference(model,C.normalize(raw),scale);const s=C.normalize(raw),wide=s.design==='landscape',navy=s.design==='navy-gold',iraqi=s.design==='iraqi-paper',minimal=s.design==='minimal-modern',islamic=s.design==='islamic-corners',newDesign=navy||iraqi||minimal||islamic,titleOffset=navy?39:newDesign?40:s.design==='architectural'?30:18,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),fractions=navy?[.16,.1,...Array(6).fill(.74/6)]:[.165,.11,...Array(6).fill(.725/6)],labels=['الأيام','التاريخ','الفجر','الشروق','الظهر','العصر','المغرب','العشاء'];
  // Reserve real space for the chosen font instead of silently shrinking it.
  const columnMin=labels.map((label,i)=>{const id=i===0?'weekday':i===1?'date':'times',samples=i===0?model.days.map(r=>r.weekday):i===1?model.days.map(r=>String(r.day)):model.days.map(r=>r.times[C.fields[i-2]]);
   ctx.font=s.styles[id].size+'px "'+s.styles[id].font+'", serif';const body=Math.max(...samples.map(v=>ctx.measureText(v).width));
   ctx.font=s.styles.headers.size+'px "'+s.styles.headers.font+'", serif';return Math.ceil(Math.max(body,ctx.measureText(label).width)+16);
  }),edge=islamic?54:newDesign?40:s.design==='architectural'?28:20,minTable=columnMin.reduce((a,b)=>a+b,0),W=Math.max(wide?1580:newDesign?1200:1080,Math.ceil((navy?Math.max(...columnMin.map((v,i)=>v/fractions[i])):minTable)*(wide?2:1)+(wide?20:0)+edge*2)),yearHeight=Math.max(64,Math.ceil(Math.max(s.styles.hijri.size,s.styles.gregorian.size,s.styles.yearLabel.size)*1.35)),tableTop=titleOffset+92+6+yearHeight+(navy?21:12),rowCount=Math.ceil(model.days.length/(wide?2:1)),rowMinimum=Math.ceil(Math.max(s.styles.weekday.size,s.styles.date.size,s.styles.times.size)*1.2),H=Math.max(wide?1080:newDesign?1720:1580,tableTop+Math.max(44,Math.ceil(s.styles.headers.size*1.5))+rowMinimum*rowCount+28);
  canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);ctx.scale(scale,scale);ctx.fillStyle=s.page;ctx.fillRect(0,0,W,H);ctx.direction='rtl';ctx.textBaseline='middle';

  function box(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  function text(value,x,y,w,id,height){const g=s.styles[id];let n=g.size;ctx.save();ctx.beginPath();ctx.rect(x,y-(height||90)/2,w,height||90);ctx.clip();ctx.textAlign='center';ctx.fillStyle=g.color;ctx.font=n+'px "'+g.font+'", serif';ctx.fillText(String(value),x+w/2,y);ctx.restore();}
  const geometric=s.design==='geometric',ledger=s.design==='ledger',architectural=s.design==='architectural',inner=W-edge*2;
  if(navy){box(0,0,W,tableTop-32,s.styles.title.bg);box(0,tableTop-32,W,3,s.border);}
  if(minimal){box(edge-10,titleOffset,6,yearHeight+92,s.border);}
  if(iraqi)box(edge-12,titleOffset-12,inner+24,yearHeight+110,s.styles.title.bg);
  if(islamic){ctx.strokeStyle=s.border;ctx.lineWidth=2;ctx.strokeRect(20,20,W-40,H-40);ctx.lineWidth=1;ctx.strokeRect(29,29,W-58,H-58);for(const [x,y,sx,sy] of [[32,32,1,1],[W-32,32,-1,1],[32,H-32,1,-1],[W-32,H-32,-1,-1]]){ctx.save();ctx.translate(x,y);ctx.scale(sx*.3,sy*.3);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,60);ctx.lineTo(0,0);ctx.lineTo(60,0);for(const radius of [26,18]){ctx.moveTo(32-radius,32);ctx.lineTo(32,32-radius);ctx.lineTo(32+radius,32);ctx.lineTo(32,32+radius);ctx.closePath();}ctx.stroke();ctx.restore();}}
  if(geometric)box(0,0,W,10,s.border);
  if(ledger){box(0,0,10,H,s.border);box(W-10,0,10,H,s.border);}
  if(architectural){ctx.strokeStyle=s.border;ctx.lineWidth=3;ctx.strokeRect(8,8,W-16,H-16);ctx.lineWidth=1;ctx.strokeRect(16,16,W-32,H-32);for(const x of [edge,W-edge]){ctx.beginPath();ctx.moveTo(x,22);ctx.lineTo(x===edge?x+80:x-80,22);ctx.stroke();}}
  // A single RTL line, with independently styled runs and uniform font fitting.
  // Letter proportions stay natural: there is no horizontal canvas scaling.
  const titleTop=titleOffset,titleH=92,titleY=titleTop+titleH/2;
  const runs=[{id:'title',value:'مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر'},{id:'month',value:model.monthName+' ['+model.month+']'}];
  let factor=1;
  function widths(){return runs.map(r=>{const g=s.styles[r.id];ctx.font=(g.size*factor)+'px "'+g.font+'", serif';return ctx.measureText(r.value).width;});}
  let sizes=widths(),gap=14,total=sizes[0]+sizes[1]+gap;
  factor=Math.min(1,(inner-24)/total,64/Math.max(...runs.map(r=>s.styles[r.id].size)));
  sizes=widths();total=sizes[0]+sizes[1]+gap*factor;
  box(edge,titleTop,inner,titleH,s.styles.title.bg);
  ctx.save();ctx.beginPath();ctx.rect(edge,titleTop,inner,titleH);ctx.clip();ctx.textAlign='right';let right=(W+total)/2;
  runs.forEach((r,i)=>{const g=s.styles[r.id],width=sizes[i];if(i)box(right-width-4,titleTop,width+8,titleH,g.bg);ctx.font=(g.size*factor)+'px "'+g.font+'", serif';ctx.fillStyle=g.color;ctx.fillText(r.value,right,titleY);right-=width+gap*factor;});ctx.restore();
  const yearsY=titleTop+titleH+(navy?-11:6),yearH=yearHeight;
  for(const [id,value,x,w] of [['gregorian',model.year+' م',edge,inner*.34],['yearLabel','لسنة',edge+inner*.34,inner*.32],['hijri',model.hijriYear+' هـ',edge+inner*.66,inner*.34]]){box(x,yearsY,w,yearH,s.styles[id].bg);text(value,x+6,yearsY+yearH/2,w-12,id,yearH);}
  const top=navy?tableTop:yearsY+yearH+12,bottom=H-edge;
  if(ledger||architectural){box(edge,top-6,inner,2,s.border);}
  function table(rows,left,width){const header=Math.max(navy?51:44,Math.ceil(s.styles.headers.size*1.5)),rowH=(bottom-top-header)/Math.ceil(wide?model.days.length/2:model.days.length),columns=[{id:'weekday',label:'الأيام'},{id:'date',label:'التاريخ'},...C.fields.map((id,i)=>({id,label:['الفجر','الشروق','الظهر','العصر','المغرب','العشاء'][i]}))];let right=left+width;
   columns.forEach((col,i)=>{col.width=navy?Math.max(columnMin[i],width*fractions[i]):columnMin[i]+(width-minTable)*fractions[i];col.x=right-col.width;right=col.x;box(col.x,top,col.width,header,s.styles.headers.bg);text(col.label,col.x+4,top+header/2,col.width-8,'headers',header);});
   rows.forEach((row,i)=>{const y=top+header+i*rowH;for(const col of columns){const id=col.id==='weekday'?'weekday':col.id==='date'?'date':'times',value=id==='weekday'?row.weekday:id==='date'?row.day:row.times[col.id];box(col.x,y+(ledger?2:0),col.width,rowH-(ledger?4:0),s.styles[id].bg);if((geometric||ledger||navy||minimal||islamic)&&i%2===0){ctx.save();ctx.globalAlpha=navy?1:.65;box(col.x,y,col.width,rowH,s.page);ctx.restore();}if(row.weekday==='الجمعة'){ctx.fillStyle=s.border;ctx.globalAlpha=.12;ctx.fillRect(col.x,y,col.width,rowH);ctx.globalAlpha=1;}text(value,col.x+4,y+rowH/2,col.width-8,id,rowH);}});
   const end=top+header+rows.length*rowH;ctx.strokeStyle=s.border;ctx.lineWidth=1;for(const x of ((geometric||ledger||navy||minimal)?[]:[left,...columns.map(c=>c.x+c.width)])){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,end);ctx.stroke();}for(const y of ((ledger||minimal)?[top,top+header]:[top,top+header,...rows.map((_,i)=>top+header+(i+1)*rowH)])){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+width,y);ctx.stroke();}if(geometric){box(left+width-5,top,5,end-top,s.border);}if(navy)box(left,end+12,width,3,s.border);
  }
  if(wide){const count=Math.ceil(model.days.length/2),gap=20,width=(inner-gap)/2;table(model.days.slice(0,count),edge+width+gap,width);table(model.days.slice(count),edge,width);}else table(model.days,edge,inner);
  canvas.calendarFontSizes={title:s.styles.title.size*factor,month:s.styles.month.size*factor};return canvas;
 }
 // The approved conversation mockup has its own renderer; unrelated layouts are untouched.
 function renderNavy(model,s,scale){
  const canvas=document.createElement('canvas'),c=canvas.getContext('2d'),ratio=[.16,.1,...Array(6).fill(.74/6)],labels=['الأيام','التاريخ','الفجر','الشروق','الظهر','العصر','المغرب','العشاء'],margin=40;
  const setFont=(g,size=g.size)=>{c.textRendering=g.font==='Times New Roman'?'geometricPrecision':'auto';c.font=size+'px "'+(g.font==='Times New Roman'?'AoqatNavyNumerals':g.font)+'", serif';};
  let W=1200;for(let i=0;i<8;i++){const id=i===0?'weekday':i===1?'date':'times',values=i===0?model.days.map(r=>r.weekday):i===1?model.days.map(r=>String(r.day)):model.days.map(r=>r.times[C.fields[i-2]]);setFont(s.styles[id]);const body=Math.max(...values.map(v=>c.measureText(v).width));setFont(s.styles.headers);W=Math.max(W,Math.ceil((Math.max(body,c.measureText(labels[i]).width)+8)/ratio[i]+margin*2));}
  const yearExtra=Math.max(0,Math.max(s.styles.hijri.size,s.styles.gregorian.size,s.styles.yearLabel.size)-48),top=222+yearExtra,header=Math.max(51,s.styles.headers.size*1.5),rowMin=Math.max(s.styles.weekday.size,s.styles.date.size,s.styles.times.size)*1.2,H=Math.max(1720,Math.ceil(top+header+rowMin*model.days.length+40)),tw=W-margin*2,bottom=H-40,rh=(bottom-top-header)/model.days.length;
  canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);c.scale(scale,scale);c.direction='rtl';c.textBaseline='middle';
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const line=(x,y,x2,y2,col,width=1)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
  function text(t,x,y,width,id){c.save();c.fillStyle=s.styles[id].color;c.textAlign='center';setFont(s.styles[id]);c.fillText(String(t),x+width/2,y);c.restore();}
  rect(0,0,W,H,s.page);rect(0,0,W,190+yearExtra,s.styles.title.bg);rect(0,190+yearExtra,W,4,'#bb9850');
  const title='مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر',month=model.monthName+' ['+model.month+']',a=s.styles.title,b=s.styles.month;
  setFont(a);const aw=c.measureText(title+' ').width;setFont(b);const bw=c.measureText(month).width;
  const factor=Math.min(1,(tw-12)/(aw+bw));
  if(a.font===b.font&&a.size===b.size&&a.color===b.color){c.save();c.fillStyle=a.color;c.textAlign='center';setFont(a,a.size*factor);c.fillText(title+' '+month,W/2,85);c.restore();}
  else{c.save();c.textAlign='right';let right=(W+(aw+bw)*factor)/2;for(const [v,g,width] of [[title+' ',a,aw],[month,b,bw]]){c.fillStyle=g.color;setFont(g,g.size*factor);c.fillText(v,right,85);right-=width*factor;}c.restore();}
  text(model.year+' م',margin,152+yearExtra,tw*.32,'gregorian');text('لسنة',margin+tw*.36,152+yearExtra,tw*.28,'yearLabel');text(model.hijriYear+' هـ',margin+tw*.68,152+yearExtra,tw*.32,'hijri');
  let right=W-margin;const columns=ratio.map((f,i)=>{const w=tw*f,col={i,x:right-w,w};right-=w;return col;});
  for(const col of columns){rect(col.x,top,col.w,header,s.styles.headers.bg);text(labels[col.i],col.x+4,top+header/2,col.w-8,'headers');}
  for(const [i,row] of model.days.entries()){const y=top+header+i*rh,friday=row.weekday==='الجمعة';for(const col of columns){const id=col.i===0?'weekday':col.i===1?'date':'times',bg=friday?'#f3e7cb':i%2?s.styles[id].bg:s.page;rect(col.x,y,col.w,rh,bg);const value=col.i===0?row.weekday:col.i===1?String(row.day):row.times[C.fields[col.i-2]];text(value,col.x+4,y+rh/2,col.w-8,id);}line(margin,y+rh,W-margin,y+rh,s.border,.8);}
  rect(margin,bottom+13,tw,3,'#bb9850');canvas.calendarFontSizes={title:a.size*factor,month:b.size*factor};return canvas;
 }
 function renderReference(model,s,scale){
  const canvas=document.createElement('canvas'),c=canvas.getContext('2d'),ratio=[.16,.1,...Array(6).fill(.74/6)],labels=['الأيام','التاريخ','الفجر','الشروق','الظهر','العصر','المغرب','العشاء'],iraqi=s.design==='iraqi-paper',modern=s.design==='minimal-modern',ornate=s.design==='islamic-corners',margin=ornate?54:40;
  const setFont=(g,size=g.size)=>{c.textRendering=g.font==='Times New Roman'?'geometricPrecision':'auto';c.font=size+'px "'+(g.font==='Times New Roman'?'AoqatNavyNumerals':g.font)+'", serif';};
  let W=1200;for(let i=0;i<8;i++){const id=i===0?'weekday':i===1?'date':'times',values=i===0?model.days.map(r=>r.weekday):i===1?model.days.map(r=>String(r.day)):model.days.map(r=>r.times[C.fields[i-2]]);setFont(s.styles[id]);const body=Math.max(...values.map(v=>c.measureText(v).width));setFont(s.styles.headers);W=Math.max(W,Math.ceil((Math.max(body,c.measureText(labels[i]).width)+8)/ratio[i]+margin*2));}
  const yearExtra=Math.max(0,Math.max(s.styles.hijri.size,s.styles.gregorian.size,s.styles.yearLabel.size)-48),top=222+yearExtra,header=Math.max(51,s.styles.headers.size*1.5),rowMin=Math.max(s.styles.weekday.size,s.styles.date.size,s.styles.times.size)*1.2,H=Math.max(1720,Math.ceil(top+header+rowMin*model.days.length+(ornate?55:40))),tw=W-margin*2,bottom=H-(ornate?55:40),rh=(bottom-top-header)/model.days.length;
  canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);c.scale(scale,scale);c.direction='rtl';c.textBaseline='middle';
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const line=(x,y,x2,y2,col,width=1)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();};
  function text(t,x,y,width,id){c.save();c.fillStyle=s.styles[id].color;c.textAlign='center';setFont(s.styles[id]);c.fillText(String(t),x+width/2,y);c.restore();}
  rect(0,0,W,H,s.page);const accent=s.styles.yearLabel.color;
  if(iraqi){rect(24,24,W-48,170+yearExtra,s.styles.title.bg);line(40,194+yearExtra,W-40,194+yearExtra,accent,3);}
  if(modern){rect(40,30,7,138+yearExtra,accent);line(40,190+yearExtra,W-40,190+yearExtra,s.border,2);}
  if(ornate){c.strokeStyle=accent;c.lineWidth=2;c.strokeRect(20,20,W-40,H-40);c.lineWidth=1;c.strokeRect(29,29,W-58,H-58);for(const [x,y,sx,sy] of [[40,40,1,1],[W-40,40,-1,1],[40,H-40,1,-1],[W-40,H-40,-1,-1]]){c.save();c.translate(x,y);c.scale(sx,sy);c.lineWidth=2;c.beginPath();c.moveTo(0,60);c.lineTo(0,0);c.lineTo(60,0);c.moveTo(6,32);c.lineTo(32,6);c.lineTo(58,32);c.lineTo(32,58);c.closePath();c.moveTo(14,32);c.lineTo(32,14);c.lineTo(50,32);c.lineTo(32,50);c.closePath();c.stroke();c.restore();}}
  const title='مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر',month=model.monthName+' ['+model.month+']',a=s.styles.title,b=s.styles.month;
  setFont(a);const aw=c.measureText(title+' ').width;setFont(b);const bw=c.measureText(month).width;
  const factor=Math.min(1,(tw-12)/(aw+bw));
  if(a.font===b.font&&a.size===b.size&&a.color===b.color){c.save();c.fillStyle=a.color;c.textAlign='center';setFont(a,a.size*factor);c.fillText(title+' '+month,W/2,85);c.restore();}
  else{c.save();c.textAlign='right';let right=(W+(aw+bw)*factor)/2;for(const [v,g,width] of [[title+' ',a,aw],[month,b,bw]]){c.fillStyle=g.color;setFont(g,g.size*factor);c.fillText(v,right,85);right-=width*factor;}c.restore();}
  text(model.year+' م',margin,152+yearExtra,tw*.32,'gregorian');text('لسنة',margin+tw*.36,152+yearExtra,tw*.28,'yearLabel');text(model.hijriYear+' هـ',margin+tw*.68,152+yearExtra,tw*.32,'hijri');
  let right=W-margin;const columns=ratio.map((f,i)=>{const w=tw*f,col={i,x:right-w,w};right-=w;return col;});
  for(const col of columns){rect(col.x,top,col.w,header,s.styles.headers.bg);text(labels[col.i],col.x+4,top+header/2,col.w-8,'headers');}
  for(const [i,row] of model.days.entries()){const y=top+header+i*rh,friday=row.weekday==='الجمعة';for(const col of columns){const id=col.i===0?'weekday':col.i===1?'date':'times',bg=iraqi?(col.i===0?(friday?'#e1c69d':s.styles.weekday.bg):col.i===1?s.styles.date.bg:friday?'#c5dcb6':i%2?s.styles.times.bg:'#e6efdf'):(friday?(modern?'#deeeeb':'#e5ebd8'):i%2?s.styles[id].bg:s.page);rect(col.x,y,col.w,rh,bg);const value=col.i===0?row.weekday:col.i===1?String(row.day):row.times[C.fields[col.i-2]];text(value,col.x+4,y+rh/2,col.w-8,id);}if(modern&&friday)rect(W-margin-5,y,5,rh,accent);if(!modern)line(margin,y+rh,W-margin,y+rh,s.border,.8);}
  if(!modern)for(const x of [margin,...columns.map(col=>col.x+col.w)])line(x,top,x,bottom,s.border,.8);canvas.calendarFontSizes={title:a.size*factor,month:b.size*factor};return canvas;
 }
 function blob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('تعذر تجهيز صورة التقويم.')),type));}
 window.AoqatMonthlyCalendarRenderer={render,blob};
})();
