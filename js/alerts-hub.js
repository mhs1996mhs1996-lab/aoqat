(function(){'use strict';
  // Reparent original controls only. Never create a second timer, notification or storage key.
  const parked=document.createElement('div');
  parked.id='aoqatAlertSettingsParking';parked.hidden=true;
  (document.body||document.documentElement).appendChild(parked);
  const publishIds=['autoTomorrowToggle','tomorrowAlarmEnable','tomorrowNotifyToggle','publishSnoozeMinutes'];
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
      // The original toggle, permission control and appearance selector belong
      // to one group; parking only the toggle emptied the Iqama submenu.
      const group=document.getElementById('iqamaNotificationSettings');
      if(group){
        if(!parked.contains(group)&&!group.closest('#webSubBody'))parked.appendChild(group);
      }else{
        const button=document.getElementById('iqamaNotificationToggle');
        if(button&&!parked.contains(button)&&!button.closest('#webSubBody'))parked.appendChild(button);
      }
    }
  }
  function park(){
    const body=document.getElementById('webSubBody');
    if(!body)return;
    for(const selector of ['#iqamaNotificationSettings','#iqamaNotificationToggle','#autoTomorrowToggle','#tomorrowAlarmEnable','#tomorrowNotifyToggle','#publishSnoozeMinutes','.tomorrow-alarm-note']){
      const node=body.querySelector(selector);if(!node)continue;
      const element=node.id==='publishSnoozeMinutes'?(node.closest('label')||node):node;
      if(body.contains(element))parked.appendChild(element);
    }
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
    // Keep explanatory prose out of the controls; original timer and snooze handlers are retained.
    if(!root.querySelector('button'))root.append('خيارات تنبيه النشر غير متاحة على هذا الجهاز.');
    return root;
  }
  function iqamaView(){
    adopt();
    const root=page('إشعار الإقامة','تفعيل الإشعار وخيارات ظهوره على الهاتف، مع الحفاظ على إعدادات الإقامة المحفوظة.');
    const web=document.getElementById('iqamaNotificationSettings');
    if(web){
      const toggle=document.getElementById('iqamaNotificationToggle');
      if(toggle&&!web.contains(toggle))web.insertBefore(toggle,web.querySelector('label')||null);
      const repair=document.getElementById('iqamaBackgroundAccess');
      if(repair&&!web.contains(repair))web.insertBefore(repair,web.querySelector('label')||null);
      root.append(web);return root;
    }
    const button=document.getElementById('iqamaNotificationToggle');
    if(button){root.append(button);return root;}
    const info=document.createElement('p');info.textContent='تنبيهات الإقامة تعتمد على إعدادات الإقامة الأصلية في التطبيق.';root.append(info);return root;
  }
  new MutationObserver(adopt).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',adopt,{once:true});else adopt();
  window.addEventListener('aoqatModulesReady',adopt);
  window.AoqatAlertsHub={park,adopt,publishView,iqamaView};
})();