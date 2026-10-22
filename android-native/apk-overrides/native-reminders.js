(function(){'use strict';
 const N=window.AndroidNative;if(!N?.configureCommunityReminders)return;
 const keys=['aoqatFridayRemindersV1','aoqatFastingRemindersV1','aoqatCommunityPostsV1','aoqatAzkarRemindersV1','aoqatIqamaMinutesV1','aoqatAfterIqamaMinutesV1'];
 let timer;const original=Storage.prototype.setItem;
 function sync(){clearTimeout(timer);N.configureCommunityReminders(JSON.stringify({friday:AoqatFridayReminders.read(),fasting:AoqatFastingReminders.read(),posts:AoqatCommunityPosts.read(),azkar:AoqatAzkarReminders.read()}));}
 Storage.prototype.setItem=function(key,value){original.call(this,key,value);if(this===localStorage&&keys.includes(key)){clearTimeout(timer);timer=setTimeout(sync,100);}};
 function refresh(){if(!window.aoqatUIReady){setTimeout(refresh,100);return;}try{for(const row of JSON.parse(N.readCommunityReminderInbox()))AoqatReminderInbox.add(row);const id=N.consumeCommunityReminderId();if(id)window.aoqatOpenNotification?.(id);}catch(_){} }
 window.aoqatRefreshNativeReminders=refresh;
 function init(){sync();refresh();}
 window.addEventListener('aoqatPrayerRowsUpdated',()=>{sync();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
