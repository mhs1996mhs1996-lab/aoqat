(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;const C=window.AoqatMonthlyCalendarsCore;if(!C)return;
 let loaded;function font(){if(!loaded)loaded=(async()=>{const f=new FontFace('AoqatCalendar','url("/assets/fonts/amiri-quran.ttf")');await f.load();document.fonts.add(f);await document.fonts.ready;})().catch(e=>{loaded=null;throw e;});return loaded;}
 async function render(model,raw,scale=1){await font();const s=C.normalize(raw),wide=s.design==='landscape',W=wide?1580:1080,H=wide?1080:1580,canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle=s.page;ctx.fillRect(0,0,W,H);ctx.direction='rtl';ctx.textBaseline='middle';
  function box(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  function text(value,x,y,w,id,height){const g=s.styles[id];let n=Math.min(g.size,height?height*.72:g.size);ctx.save();ctx.beginPath();ctx.rect(x,y-(height||90)/2,w,height||90);ctx.clip();ctx.textAlign='center';ctx.fillStyle=g.color;ctx.font=n+'px "'+g.font+'"';while(n>10&&ctx.measureText(String(value)).width>w){n-=.5;ctx.font=n+'px "'+g.font+'"';}ctx.fillText(String(value),x+w/2,y);ctx.restore();}
  const geometric=s.design==='geometric',edge=20,inner=W-edge*2;
  // Each layout has its own hierarchy, not a different border around the same poster.
  let top;
  if(geometric){
   box(0,0,W,12,s.border);
   box(edge,28,inner,82,s.styles.title.bg);
   text('مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر',edge+12,69,inner-24,'title',82);
   box(edge,118,inner*.56,102,s.styles.month.bg);
   text(model.monthName+' ['+model.month+']',edge+10,169,inner*.56-20,'month',86);
   const yearX=edge+inner*.58,yearW=inner*.42;
   text(model.year+' م',yearX,146,yearW,'gregorian',56);
   text(model.hijriYear+' هـ',yearX,198,yearW,'hijri',56);
   text('لسنة',edge,230,inner,'yearLabel',44);
   top=258;
  }else if(wide){
   box(edge,16,inner,64,s.styles.title.bg);
   text('مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر',edge+12,48,inner-24,'title',64);
   box(edge,90,inner,90,s.styles.month.bg);
   text(model.monthName+' ['+model.month+']',edge+inner*.3,132,inner*.4,'month',72);
   text(model.year+' م',edge,132,inner*.28,'gregorian',72);
   text(model.hijriYear+' هـ',edge+inner*.72,132,inner*.28,'hijri',72);
   text('لسنة',edge,191,inner,'yearLabel',34);top=218;
  }else{
   box(edge,12,inner,72,s.styles.title.bg);
   text('مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر',edge+8,48,inner-16,'title',72);
   box(edge,86,inner,64,s.styles.month.bg);
   text(model.monthName+' ['+model.month+']',edge+8,118,inner-16,'month',64);
   for(const [id,value,x,w] of [['gregorian',model.year+' م',edge,inner*.34],['yearLabel','لسنة',edge+inner*.34,inner*.32],['hijri',model.hijriYear+' هـ',edge+inner*.66,inner*.34]]){box(x,153,w,58,s.styles[id].bg);text(value,x+6,182,w-12,id,58);}
   top=222;
  }
  const bottom=H-edge;
  function table(rows,left,width){const header=44,rowH=(bottom-top-header)/Math.ceil(wide?model.days.length/2:model.days.length),fractions=[.165,.11,...Array(6).fill(.725/6)],columns=[{id:'weekday',label:'الأيام'},{id:'date',label:'التاريخ'},...C.fields.map((id,i)=>({id,label:['الفجر','الشروق','الظهر','العصر','المغرب','العشاء'][i]}))];let right=left+width;
   columns.forEach((col,i)=>{col.width=width*fractions[i];col.x=right-col.width;right=col.x;box(col.x,top,col.width,header,s.styles.headers.bg);text(col.label,col.x+4,top+header/2,col.width-8,'headers',header);});
   rows.forEach((row,i)=>{const y=top+header+i*rowH;for(const col of columns){const id=col.id==='weekday'?'weekday':col.id==='date'?'date':'times',value=id==='weekday'?row.weekday:id==='date'?row.day:row.times[col.id];box(col.x,y,col.width,rowH,s.styles[id].bg);if(geometric&&i%2===0){ctx.save();ctx.globalAlpha=.65;box(col.x,y,col.width,rowH,s.page);ctx.restore();}if(row.weekday==='الجمعة'){ctx.fillStyle=s.border;ctx.globalAlpha=.12;ctx.fillRect(col.x,y,col.width,rowH);ctx.globalAlpha=1;}text(value,col.x+4,y+rowH/2,col.width-8,id,rowH);}});
   const end=top+header+rows.length*rowH;ctx.strokeStyle=s.border;ctx.lineWidth=1;for(const x of (geometric?[]:[left,...columns.map(c=>c.x+c.width)])){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,end);ctx.stroke();}for(const y of [top,top+header,...rows.map((_,i)=>top+header+(i+1)*rowH)]){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+width,y);ctx.stroke();}if(geometric){box(left+width-5,top,5,end-top,s.border);}
  }
  if(wide){const count=Math.ceil(model.days.length/2),gap=20,width=(inner-gap)/2;table(model.days.slice(0,count),edge+width+gap,width);table(model.days.slice(count),edge,width);}else table(model.days,edge,inner);
  return canvas;
 }
 function blob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('تعذر تجهيز صورة التقويم.')),type));}
 window.AoqatMonthlyCalendarRenderer={render,blob};
})();
