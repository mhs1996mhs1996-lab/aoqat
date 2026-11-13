(function(){'use strict';
  // Reparent original controls only. Never create a second timer, notification or storage key.
  const parked=document.createElement('div');
  parked.id='aoqatAlertSettingsParking';parked.hidden=true;
  (document.body||document.documentElement).appendChild(parked);
  const publishIds=['autoTomorrowToggle','previewDayToggle','tomorrowAlarmEnable','tomorrowNotifyToggle','publishSnoozeMinutes','tomorrowSwitchStatus'];
  function original(id){
    const node=document.getElementById(id);
    if(!node)return null;
    return id==='publishSnoozeMinutes'?(node.closest('label')||node):node;
  }
  function adopt(){
    for(const id of publishIds){
      const node=original(id);
      if(node&&!parked.contains(node)&&!node.closest('#webSubBody'))parked.appendChild(node);
    }
    const note=document.querySelector('#switchPanel .tomorrow-alarm-note');
    if(note&&!parked.contains(note))parked.appendChild(note);
    if(window.AndroidNative?.configureAdhan){
      const group=document.getElementById('iqamaNotificationSettings');
      if(group){
        if(!parked.contains(group)&&!group.closest('#webSubBody')&&!group.closest('#adIqamaNoticeContent'))parked.appendChild(group);
      }else{
        const button=document.getElementById('iqamaNotificationToggle');
        if(button&&!parked.contains(button)&&!button.closest('#webSubBody')&&!button.closest('#adIqamaNoticeContent'))parked.appendChild(button);
      }
    }
  }
  function park(){
    const body=document.getElementById('webSubBody');
    if(!body)return;
    for(const selector of ['#iqamaNotificationSettings','#iqamaNotificationToggle','#autoTomorrowToggle','#previewDayToggle','#tomorrowAlarmEnable','#tomorrowNotifyToggle','#publishSnoozeMinutes','#tomorrowSwitchStatus','.tomorrow-alarm-note']){
      const node=body.querySelector(selector);if(!node)continue;
      const element=node.id==='publishSnoozeMinutes'?(node.closest('label')||node):node;
      if(body.contains(element))parked.appendChild(element);
    }
  }
  // The original notification controls must survive prayer-setting rerenders.
  function parkIqama(){
    const group=document.getElementById('iqamaNotificationSettings');
    if(group&&!parked.contains(group)){parked.appendChild(group);return;}
    const button=document.getElementById('iqamaNotificationToggle');
    if(button&&!parked.contains(button))parked.appendChild(button);
  }
  function page(title,description){
    const root=document.createElement('section');root.dir='rtl';root.className='web-settings-list';
    const head=document.createElement('h3');head.textContent=title;root.append(head);
    if(description){const note=document.createElement('p');note.className='ad-note';note.textContent=description;root.append(note);}
    return root;
  }
  function publishView(){
    adopt();
    const root=page('التبديل التلقائي وتنبيه النشر');
    for(const id of publishIds){const node=original(id);if(node)root.append(node);}
    // The original status field stays in the page; redundant prose stays parked.
    if(!root.querySelector('button'))root.append('خيارات تنبيه النشر غير متاحة على هذا الجهاز.');
    return root;
  }
  function iqamaView(){
    adopt();
    const root=page('إشعار الإقامة','إعدادات إشعار الإقامة الحالية، بدون تغيير عدّاد باقي على الإقامة أو مضى على الإقامة.');
    const web=document.getElementById('iqamaNotificationSettings');
    if(web){
      const toggle=document.getElementById('iqamaNotificationToggle');
      if(toggle&&!web.contains(toggle))web.appendChild(toggle);
      root.append(web);return root;
    }
    const button=document.getElementById('iqamaNotificationToggle');
    if(button){root.append(button);return root;}
    const info=document.createElement('p');info.textContent='تنبيهات الإقامة تعتمد على إعدادات الإقامة الأصلية في التطبيق.';root.append(info);return root;
  }
  new MutationObserver(adopt).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',adopt,{once:true});else adopt();
  window.addEventListener('aoqatModulesReady',adopt);
  window.AoqatAlertsHub={park,adopt,parkIqama,publishView,iqamaView};
})();