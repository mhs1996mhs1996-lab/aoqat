(function(){'use strict';
  if(window.AndroidNative?.configureAdhan)return;
  const palettes=[
    {name:'أخضر وذهبي',bg:'#f6f2e6',card:'#fffdf7',ink:'#173f35',accent:'#b38a40'},
    {name:'ليلة كحلية',bg:'#101f32',card:'#1b3048',ink:'#fff9e9',accent:'#e4bf72'},
    {name:'أبيض وأزرق',bg:'#edf5fa',card:'#ffffff',ink:'#153b59',accent:'#32829d'},
    {name:'بنفسجي هادئ',bg:'#f4edf4',card:'#fffaff',ink:'#4e3058',accent:'#a87476'},
    {name:'زيتوني ورملي',bg:'#ede9da',card:'#fbf8ee',ink:'#3f4b31',accent:'#9e753c'},
    {name:'فيروزي',bg:'#e9f4f0',card:'#fcfffc',ink:'#154b4a',accent:'#358b79'}
  ];
  let fontPromise;
  async function font(){
    if(!fontPromise)fontPromise=(async()=>{
      const face=new FontFace('AoqatSocial','url("/assets/fonts/amiri-quran.ttf")');
      await face.load();document.fonts.add(face);await document.fonts.ready;
    })().catch(error=>{fontPromise=null;throw error;});
    return fontPromise;
  }
  function lines(ctx,text,width){
    const out=[];let row='';
    for(const word of String(text).split(/\s+/)){const next=row?row+' '+word:word;if(row&&ctx.measureText(next).width>width){out.push(row);row=word;}else row=next;}
    if(row)out.push(row);return out;
  }
  function fit(ctx,text,width,size,maxLines){
    let rows;do{ctx.font=size+'px AoqatSocial';rows=lines(ctx,text,width);if(rows.length<=maxLines)break;size-=1;}while(size>20);
    return {rows,size};
  }
  function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function text(ctx,value,x,y,size,color,align='right'){
    ctx.font=size+'px AoqatSocial';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);
  }
  function card(ctx,p,index,y,height,body,ref,width=830){
    ctx.fillStyle=p.card;rounded(ctx,58,y,964,height,14+index%3*10);
    ctx.fillStyle=p.accent;rounded(ctx,985,y+18,6,height-36,3);
    text(ctx,String(index+1).padStart(2,'0'),104,y+44,26,p.accent,'center');
    const f=fit(ctx,body,width,33,2);ctx.font=f.size+'px AoqatSocial';ctx.fillStyle=p.ink;ctx.textAlign='right';
    f.rows.forEach((line,i)=>ctx.fillText(line,956,y+34+i*37));
    text(ctx,ref,956,y+height-11,19,p.ink);
  }
  const fridayRows=[
    ['الإكثار من الصلاة على النبي ﷺ.','أبو داود 1047'],
    ['قراءة سورة الكهف يوم الجمعة.','فتوى ابن باز: وقت قراءة سورة الكهف'],
    ['الاغتسال، واستعمال السواك والتطيّب لصلاة الجمعة.','مسلم 846'],
    ['لبس الثياب الحسنة والنظيفة.','أبو داود 1078'],
    ['التبكير إلى المسجد لصلاة الجمعة.','البخاري 881'],
    ['الصلاة مما تيسّر قبل الخطبة، وعدم إيذاء المصلّين.','البخاري 883'],
    ['الإنصات والاستماع للخطبة.','البخاري 883'],
    ['الصلاة بعد الجمعة أربع ركعات، أو ركعتين في البيت.','مسلم 881؛ البخاري 937'],
    ['الإكثار من الدعاء وتحرّي ساعة الإجابة.','البخاري 935؛ مسلم 852']
  ];
  function dateLabel(key){
    const date=new Date(key+'T12:00:00+03:00'),h=window.AoqatFastingPostsCalendar.date(date);return new Intl.DateTimeFormat('ar-IQ',{timeZone:'Asia/Baghdad',weekday:'long'}).format(date)+' '+h.day+' '+window.AoqatFastingPostsCalendar.names[h.month-1]+' '+h.year+' هـ';
  }
  const layouts=['بطاقات متتابعة','مسار مرقّم','بطاقات متقابلة','مجموعات متناسقة','بطاقات متدرجة','ترتيب تحريري'];
  function paragraph(ctx,value,x,y,width,size,maxLines,color,align='right',step=1.25){
    const f=fit(ctx,value,width,size,maxLines);f.rows.forEach((line,i)=>text(ctx,line,x,y+i*f.size*step,f.size,color,align));return f.rows.length*f.size*step;
  }
  function fridayLayout(ctx,p,index){
    fridayRows.forEach((row,i)=>{
      if(index===0){card(ctx,p,i,194+i*104,94,row[0],row[1]);return;}
      if(index===1){
        const y=194+i*104;ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1010,y);ctx.lineTo(1010,y+104);ctx.stroke();
        ctx.fillStyle=p.card;rounded(ctx,58,y,900,94,12);ctx.fillStyle=p.accent;ctx.beginPath();ctx.arc(1010,y+43,25,0,Math.PI*2);ctx.fill();text(ctx,String(i+1),1010,y+52,26,p.bg,'center');
        paragraph(ctx,row[0],928,y+34,830,33,2,p.ink);text(ctx,row[1],928,y+83,19,p.ink);return;
      }
      if(index===2){
        const last=i===8,x=last?58:(i%2===0?550:58),w=last?964:472,y=194+Math.floor(i/2)*184;
        ctx.fillStyle=p.card;rounded(ctx,x,y,w,172,20);text(ctx,String(i+1).padStart(2,'0'),x+w-26,y+31,25,p.accent);
        paragraph(ctx,row[0],x+w-26,y+68,w-52,31,3,p.ink,'right',1.12);text(ctx,row[1],x+w-26,y+157,18,p.ink);return;
      }
      if(index===3){
        const group=Math.floor(i/3),n=i%3,top=194+group*310;
        if(n===0){ctx.fillStyle=p.card;rounded(ctx,58,top,964,296,24);ctx.strokeStyle=p.accent;ctx.lineWidth=3;ctx.strokeRect(74,top+12,932,272);}
        const y=top+22+n*88;text(ctx,String(i+1)+' ·',978,y+29,28,p.accent);paragraph(ctx,row[0],914,y+27,800,32,2,p.ink);text(ctx,row[1],914,y+70,18,p.ink);return;
      }
      if(index===4){
        const x=i%2?58:118,y=194+i*104;ctx.fillStyle=p.card;rounded(ctx,x,y,904,94,32);
        text(ctx,String(i+1),x+39,y+53,30,p.accent,'center');paragraph(ctx,row[0],x+872,y+33,790,32,2,p.ink);text(ctx,row[1],x+872,y+83,19,p.ink);return;
      }
      const y=194+i*104;ctx.strokeStyle=p.accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(58,y+94);ctx.lineTo(1022,y+94);ctx.stroke();
      ctx.fillStyle=p.accent;rounded(ctx,970,y+15,52,57,4);text(ctx,String(i+1),996,y+53,29,p.bg,'center');paragraph(ctx,row[0],940,y+33,860,33,2,p.ink);text(ctx,row[1],940,y+83,19,p.ink);
    });
  }
  function fastingLayout(ctx,p,index,item,targetDate){
    const dated=targetDate?'تذكير ليوم '+dateLabel(targetDate):'';
    if(index===0){
      paragraph(ctx,item.title,540,214,900,52,2,p.accent,'center');ctx.fillStyle=p.card;rounded(ctx,64,340,952,650,28);
      const f=fit(ctx,item.text,820,48,8),top=425+(450-f.rows.length*f.size*1.35)/2;paragraph(ctx,item.text,950,top,820,f.size,8,p.ink,'right',1.35);
      paragraph(ctx,item.ref,540,950,850,26,2,p.ink,'center');paragraph(ctx,dated,540,1094,940,32,2,p.accent,'center');return;
    }
    if(index===1){
      ctx.fillStyle=p.card;rounded(ctx,64,218,952,880,10);ctx.strokeStyle=p.accent;ctx.lineWidth=3;ctx.strokeRect(82,236,916,844);
      paragraph(ctx,item.title,540,310,820,54,2,p.accent,'center');paragraph(ctx,dated,540,430,820,30,2,p.ink,'center');
      paragraph(ctx,item.text,930,590,780,47,8,p.ink,'right',1.4);paragraph(ctx,item.ref,540,1045,820,25,2,p.accent,'center');return;
    }
    if(index===2){
      ctx.fillStyle=p.accent;rounded(ctx,58,218,964,154,24);paragraph(ctx,item.title,540,281,870,51,2,p.bg,'center');
      text(ctx,'❝',957,480,90,p.accent);paragraph(ctx,item.text,940,560,810,49,8,p.ink,'right',1.4);
      ctx.fillStyle=p.card;rounded(ctx,58,956,964,156,18);paragraph(ctx,item.ref,540,1007,870,26,2,p.ink,'center');paragraph(ctx,dated,540,1076,900,30,2,p.accent,'center');return;
    }
    if(index===3){
      paragraph(ctx,item.title,540,245,900,54,2,p.accent,'center');ctx.fillStyle=p.card;rounded(ctx,58,380,964,500,24);
      paragraph(ctx,item.text,948,468,820,47,8,p.ink,'right',1.4);
      ctx.fillStyle=p.card;rounded(ctx,58,910,964,192,24);paragraph(ctx,dated,540,970,880,32,2,p.accent,'center');paragraph(ctx,item.ref,540,1050,880,26,2,p.ink,'center');return;
    }
    if(index===4){
      ctx.fillStyle=p.card;rounded(ctx,100,218,880,200,95);paragraph(ctx,item.title,540,294,780,51,2,p.accent,'center');
      ctx.strokeStyle=p.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(140,475);ctx.lineTo(940,475);ctx.moveTo(140,910);ctx.lineTo(940,910);ctx.stroke();
      paragraph(ctx,item.text,540,570,800,48,8,p.ink,'center',1.4);paragraph(ctx,item.ref,540,990,880,26,2,p.ink,'center');paragraph(ctx,dated,540,1090,930,31,2,p.accent,'center');return;
    }
    ctx.fillStyle=p.ink;rounded(ctx,58,218,964,222,12);paragraph(ctx,item.title,540,298,850,52,2,p.bg,'center');
    ctx.fillStyle=p.card;rounded(ctx,58,466,964,500,12);paragraph(ctx,item.text,947,550,814,48,8,p.ink,'right',1.4);
    paragraph(ctx,item.ref,540,1020,880,26,2,p.ink,'center');paragraph(ctx,dated,540,1100,930,31,2,p.accent,'center');
  }
  async function render(kind,topicId,now=new Date(),design='weekly',targetDate='',color='0'){
    await font();const index=window.AoqatCommunityPostsCore.themeIndex(now,design),p=palettes[Number(color)]||palettes[0],canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d');ctx.direction='rtl';ctx.fillStyle=p.bg;ctx.fillRect(0,0,1080,1350);
    ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.strokeRect(24,24,1032,1302);
    text(ctx,'أوقات الصلاة في الحويجة',540,63,25,p.ink,'center');
    text(ctx,kind==='friday'?'سنن يوم الجمعة وآدابها':'صيام التطوع',540,132,64,p.ink,'center');
    if(kind==='friday'){
      text(ctx,'تذكير نافع ليوم الجمعة',540,171,29,p.accent,'center');fridayLayout(ctx,p,index);
      text(ctx,'خلاصة للسنن والآداب؛ التفاصيل والأدلة داخل حقيبة المسلم.',540,1183,27,p.ink,'center');
      text(ctx,'الغسل والإنصات من الآداب المؤكدة؛ ليست كل البنود نوافل.',540,1224,24,p.ink,'center');
    }else{
      const item=window.AoqatFastingPostsCalendar.topic(topicId);if(!item)throw Error('No fasting occasion selected');
      fastingLayout(ctx,p,index,item,targetDate);
      text(ctx,'لا صيام في العيدين أو أيام التشريق تطوعاً.',540,1175,28,p.ink,'center');
      text(ctx,'البخاري 1990؛ مسلم 1141 • يُراعى ثبوت الهلال محلياً.',540,1219,24,p.ink,'center');
    }
    ctx.fillStyle=p.accent;ctx.fillRect(340,1252,400,2);
    text(ctx,'aoqat.vercel.app',540,1295,26,p.ink,'center');
    return {canvas,index,palette:p.name,layout:layouts[index],color:String(palettes.indexOf(p))};
  }
  window.AoqatPostRenderer={render,palettes,layouts};
})();

