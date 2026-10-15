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
    return new Intl.DateTimeFormat('ar-IQ',{timeZone:'Asia/Baghdad',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(key+'T12:00:00+03:00'));
  }
  async function render(kind,topicId,now=new Date(),design='weekly',targetDate=''){
    await font();const index=window.AoqatCommunityPostsCore.themeIndex(now,design),p=palettes[index],canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d');ctx.direction='rtl';ctx.fillStyle=p.bg;ctx.fillRect(0,0,1080,1350);
    ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.strokeRect(24,24,1032,1302);
    // Each palette also has a distinct decoration and card shape.
    ctx.save();ctx.globalAlpha=.14;ctx.fillStyle=p.accent;
    if(index%2){ctx.beginPath();ctx.arc(60,50,190,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(1040,1320,160,0,Math.PI*2);ctx.fill();}
    else{for(let n=0;n<6;n++){ctx.save();ctx.translate(90+n*180,45);ctx.rotate(Math.PI/4);ctx.fillRect(-22,-22,44,44);ctx.restore();}}
    ctx.restore();
    text(ctx,'أوقات الصلاة في الحويجة',540,63,25,p.ink,'center');
    const title=kind==='friday'?'سنن يوم الجمعة وآدابها':'صيام التطوع';
    text(ctx,title,540,132,64,p.ink,'center');
    if(kind==='friday'){
      text(ctx,'تذكير نافع ليوم الجمعة',540,171,29,p.accent,'center');
      fridayRows.forEach((row,i)=>card(ctx,p,i,194+i*104,94,row[0],row[1]));
      text(ctx,'خلاصة للسنن والآداب؛ التفاصيل والأدلة داخل حقيبة المسلم.',540,1183,27,p.ink,'center');
      text(ctx,'الغسل والإنصات من الآداب المؤكدة؛ ليست كل البنود نوافل.',540,1224,24,p.ink,'center');
    }else{
      const topics=window.AoqatMuslimBag.topics,item=topics.find(x=>x.id===topicId);
      if(item){
        const heading=fit(ctx,item.title,900,52,2);ctx.fillStyle=p.accent;ctx.textAlign='center';
        heading.rows.forEach((row,i)=>text(ctx,row,540,214+i*65,heading.size,p.accent,'center'));
        const top=heading.rows.length>1?333:290;
        ctx.fillStyle=p.card;rounded(ctx,64,top,952,690,28);
        const f=fit(ctx,item.text,820,48,8);ctx.font=f.size+'px AoqatSocial';ctx.fillStyle=p.ink;ctx.textAlign='right';
        const start=top+70+(560-f.rows.length*65)/2;
        f.rows.forEach((row,i)=>ctx.fillText(row,950,start+i*65));
        text(ctx,item.ref,540,top+645,26,p.ink,'center');
        if(targetDate)text(ctx,'تذكير ليوم '+dateLabel(targetDate),540,1094,32,p.accent,'center');
      }else{
        text(ctx,'أبواب من صيام التطوع',540,188,35,p.accent,'center');
        const summaries={'monday-thursday':'صيام الاثنين والخميس','white-days':'الأيام البيض: 13 و14 و15 من الشهر الهجري',arafah:'صيام يوم عرفة: 9 ذي الحجة لغير الحاج',ashura:'صيام عاشوراء: 10 محرم، ويُصام التاسع معه',shawwal:'ستة أيام من شوال بعد رمضان',muharram:'الإكثار من الصيام في شهر الله المحرم',dawud:'صيام داود: صيام يوم وإفطار يوم'};
        topics.forEach((item,i)=>card(ctx,p,i,222+i*124,112,summaries[item.id]||item.title,item.ref));
      }
      text(ctx,'لا صيام في العيدين أو أيام التشريق تطوعاً.',540,1175,28,p.ink,'center');
      text(ctx,'البخاري 1990؛ مسلم 1141 • يُراعى ثبوت الهلال محلياً.',540,1219,24,p.ink,'center');
    }
    ctx.fillStyle=p.accent;ctx.fillRect(340,1252,400,2);
    text(ctx,'aoqat.vercel.app',540,1295,26,p.ink,'center');
    return {canvas,index,palette:p.name};
  }
  window.AoqatPostRenderer={render,palettes};
})();
