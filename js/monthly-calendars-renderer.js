(function(){'use strict';if(window.AndroidNative?.configureAdhan)return;const C=window.AoqatMonthlyCalendarsCore;if(!C)return;
 let loaded;function font(){if(!loaded)loaded=(async()=>{const f=new FontFace('AoqatCalendar','url("/assets/fonts/amiri-quran.ttf")');await f.load();document.fonts.add(f);await document.fonts.ready;})().catch(e=>{loaded=null;throw e;});return loaded;}
 async function render(model,raw,scale=1){await font();const s=C.normalize(raw),wide=s.design==='landscape',W=wide?1580:1080,H=wide?1080:1580,canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle=s.page;ctx.fillRect(0,0,W,H);ctx.direction='rtl';ctx.textBaseline='middle';
  function box(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  function text(value,x,y,w,id,height,stretch=false){const g=s.styles[id],n=Math.min(g.size,height?height*.85:g.size);ctx.save();ctx.beginPath();ctx.rect(x,y-(height||90)/2,w,height||90);ctx.clip();ctx.font=n+'px "'+g.font+'"';ctx.fillStyle=g.color;ctx.textAlign='center';const measured=ctx.measureText(String(value)).width,ratio=stretch?w/Math.max(1,measured):Math.min(1,w/Math.max(1,measured));ctx.translate(x+w/2,y);ctx.scale(ratio,1);ctx.fillText(String(value),0,0);ctx.restore();}
  const geometric=s.design==='geometric',edge=geometric?26:12,inner=W-edge*2,titleTop=geometric?24:8,titleH=76;
  if(geometric){ctx.strokeStyle=s.border;ctx.lineWidth=3;ctx.strokeRect(9,9,W-18,H-18);ctx.lineWidth=1;ctx.strokeRect(17,17,W-34,H-34);}
  box(edge,titleTop,inner,titleH,s.styles.title.bg);text('مواقيت الصلاة لمدينة الحويجة و ضواحيها لشهر',edge+8,titleTop+titleH/2,inner-16,'title',titleH,true);
  const monthY=titleTop+titleH;box(edge,monthY,inner,54,s.styles.month.bg);text(model.monthName+' ['+model.month+']',edge+8,monthY+27,inner-16,'month',54);
  const yearsY=monthY+54;for(const [id,value,x,w] of [['gregorian',model.year+' م',edge,inner*.34],['yearLabel','لسنة',edge+inner*.34,inner*.32],['hijri',model.hijriYear+' هـ',edge+inner*.66,inner*.34]]){box(x,yearsY,w,62,s.styles[id].bg);text(value,x+6,yearsY+31,w-12,id,62);}
  const top=yearsY+68,bottom=H-edge;
  function table(rows,left,width){const header=44,rowH=(bottom-top-header)/Math.ceil(wide?model.days.length/2:model.days.length),fractions=[.165,.11,...Array(6).fill(.725/6)],columns=[{id:'weekday',label:'الأيام'},{id:'date',label:'التاريخ'},...C.fields.map((id,i)=>({id,label:['الفجر','الشروق','الظهر','العصر','المغرب','العشاء'][i]}))];let right=left+width;
   columns.forEach((col,i)=>{col.width=width*fractions[i];col.x=right-col.width;right=col.x;box(col.x,top,col.width,header,s.styles.headers.bg);text(col.label,col.x+4,top+header/2,col.width-8,'headers',header);});
   rows.forEach((row,i)=>{const y=top+header+i*rowH;for(const col of columns){const id=col.id==='weekday'?'weekday':col.id==='date'?'date':'times',value=id==='weekday'?row.weekday:id==='date'?row.day:row.times[col.id];box(col.x,y,col.width,rowH,s.styles[id].bg);if(row.weekday==='الجمعة'){ctx.fillStyle=s.border;ctx.globalAlpha=.12;ctx.fillRect(col.x,y,col.width,rowH);ctx.globalAlpha=1;}text(value,col.x+4,y+rowH/2,col.width-8,id,rowH);}});
   const end=top+header+rows.length*rowH;ctx.strokeStyle=s.border;ctx.lineWidth=1;for(const x of [left,...columns.map(c=>c.x+c.width)]){ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,end);ctx.stroke();}for(const y of [top,top+header,...rows.map((_,i)=>top+header+(i+1)*rowH)]){ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(left+width,y);ctx.stroke();}
  }
  if(wide){const count=Math.ceil(model.days.length/2),gap=20,width=(inner-gap)/2;table(model.days.slice(0,count),edge+width+gap,width);table(model.days.slice(count),edge,width);}else table(model.days,edge,inner);
  return canvas;
 }
 function blob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('تعذر تجهيز صورة التقويم.')),type));}
 window.AoqatMonthlyCalendarRenderer={render,blob};
})();
