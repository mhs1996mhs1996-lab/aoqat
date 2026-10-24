(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;const C=window.AoqatMonthlyCalendarsCore;if(!C)return;
 let loaded;function font(){if(!loaded)loaded=(async()=>{const f=new FontFace('AoqatCalendar','url("/assets/fonts/amiri-quran.ttf")');await f.load();document.fonts.add(f);await document.fonts.ready;})().catch(e=>{loaded=null;throw e;});return loaded;}
 async function render(model,raw,scale=1){
  await font();const s=C.normalize(raw),wide=s.design==='landscape',navy=s.design==='navy-gold',iraqi=s.design==='iraqi-paper',minimal=s.design==='minimal-modern',islamic=s.design==='islamic-corners',newDesign=navy||iraqi||minimal||islamic,titleOffset=newDesign?40:s.design==='architectural'?30:18,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),fractions=[.165,.11,...Array(6).fill(.725/6)],labels=['الأيام','التاريخ','الفجر','الشروق','الظهر','العصر','المغرب','العشاء'];
  // Reserve real space for the chosen font instead of silently shrinking it.
  const columnMin=labels.map((label,i)=>{const id=i===0?'weekday':i===1?'date':'times',samples=i===0?model.days.map(r=>r.weekday):i===1?model.days.map(r=>String(r.day)):model.days.map(r=>r.times[C.fields[i-2]]);
   ctx.font=s.styles[id].size+'px "'+s.styles[id].font+'", serif';const body=Math.max(...samples.map(v=>ctx.measureText(v).width));
   ctx.font=s.styles.headers.size+'px "'+s.styles.headers.font+'", serif';return Math.ceil(Math.max(body,ctx.measureText(label).width)+16);
  }),edge=islamic?54:newDesign?40:s.design==='architectural'?28:20,minTable=columnMin.reduce((a,b)=>a+b,0),W=Math.max(wide?1580:newDesign?1200:1080,Math.ceil(minTable*(wide?2:1)+(wide?20:0)+edge*2)),yearHeight=Math.max(64,Math.ceil(Math.max(s.styles.hijri.size,s.styles.gregorian.size,s.styles.yearLabel.size)*1.35)),tableTop=titleOffset+92+6+yearHeight+12,rowCount=Math.ceil(model.days.length/(wide?2:1)),rowMinimum=Math.ceil(Math.max(s.styles.weekday.size,s.styles.date.size,s.styles.times.size)*1.2),H=Math.max(wide?1080:newDesign?1720:1580,tableTop+Math.max(44,Math.ceil(s.styles.headers.size*1.5))+rowMinimum*rowCount+28);
  canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);ctx.scale(scale,scale);ctx.fillStyle=s.page;ctx.fillRect(0,0,W,H);ctx.direction='rtl';ctx.textBaseline='middle';

  function box(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  function text(value,x,y,w,id,height){const g=s.styles[id];let n=g.size;ctx.save();ctx.beginPath();ctx.rect(x,y-(height||90)/2,w,height||90);ctx.clip();ctx.textAlign='center';ctx.fillStyle=g.color;ctx.font=n+'px "'+g.font+'", serif';ctx.fillText(String(value),x+w/2,y);ctx.restore();}
  const geometric=s.design==='geometric',ledger=s.design==='ledger',architectural=s.design==='architectural',inner=W-edge*2;
  if(navy){box(0,0,W,tableTop-10,s.styles.title.bg);box(0,tableTop-10,W,3,s.border);}
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
  const yearsY=titleTop+titleH+6,yearH=yearHeight;
  for(const [id,value,x,w] of [['gregorian',model.year+' م',edge,inner*.34],['yearLabel','لسنة',edge+inner*.34,inner*.32],['hijri',model.hijriYear+' هـ',edge+inner*.66,inner*.34]]){box(x,yearsY,w,yearH,s.styles[id].bg);text(value,x+6,yearsY+yearH/2,w-12,id,yearH);}
  const top=yearsY+yearH+12,bottom=H-edge;
  if(ledger||architectural){box(edge,top-6,inner,2,s.border);}
  function table(rows,left,width){const header=Math.max(44,Math.ceil(s.styles.headers.size*1.5)),rowH=(bottom-top-header)/Math.ceil(wide?model.days.length/2:model.days.length),columns=[{id:'weekday',label:'الأيام'},{id:'date',label:'التاريخ'},...C.fields.map((id,i)=>({id,label:['الفجر','الشروق','الظهر','العصر','المغرب','العشاء'][i]}))];let right=left+width;
   columns.forEach((col,i)=>{col.width=columnMin[i]+(width-minTable)*fractions[i];col.x=right-col.width;right=col.x;box(col.x,top,col.width,header,s.styles.headers.bg);text(col.label,col.x+4,top+header/2,col.width-8,'headers',header);});
   rows.forEach((row,i)=>{const y=top+header+i*rowH;for(const col of columns){const id=col.id==='weekday'?'weekday':col.id==='date'?'date':'times',value=id==='weekday'?row.weekday:id==='date'?row.day:row.times[col.id];box(col.x,y+(ledger?2:0),col.width,rowH-(ledger?4:0),s.styles[id].bg);if((geometric||ledger||navy||minimal||islamic)&&i%2===0){ctx.save();ctx.globalAlpha=.65;box(col.x,y,col.width,rowH,s.page);ctx.restore();}if(row.weekday==='الجمعة'){ctx.fillStyle=s.border;ctx.globalAlpha=.12;ctx.fillRect(col.x,y,col.width,rowH);ctx.globalAlpha=1;}text(value,col.x+4,y+rowH/2,col.width-8,id,rowH);}});
   const end=top+header+rows.length*rowH;ctx.strokeStyle=s.border;ctx.lineWidth=1;for(const x of ((geometric||ledger||navy||minimal)?[]:[left,...columns.map(c=>c.x+c.width)])){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,end);ctx.stroke();}for(const y of ((ledger||minimal)?[top,top+header]:[top,top+header,...rows.map((_,i)=>top+header+(i+1)*rowH)])){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+width,y);ctx.stroke();}if(geometric){box(left+width-5,top,5,end-top,s.border);}if(navy)box(left,end+12,width,3,s.border);
  }
  if(wide){const count=Math.ceil(model.days.length/2),gap=20,width=(inner-gap)/2;table(model.days.slice(0,count),edge+width+gap,width);table(model.days.slice(count),edge,width);}else table(model.days,edge,inner);
  canvas.calendarFontSizes={title:s.styles.title.size*factor,month:s.styles.month.size*factor};return canvas;
 }
 function blob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('تعذر تجهيز صورة التقويم.')),type));}
 window.AoqatMonthlyCalendarRenderer={render,blob};
})();
