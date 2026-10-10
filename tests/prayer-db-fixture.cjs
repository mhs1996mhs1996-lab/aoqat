const backup=require('../data/prayer-times-offline.json');
// A mocked database must return the complete requested eight-day window.
module.exports=function prayerFixture(route,rows){
  const query=new URL(route.request().url()).searchParams.get('or');
  if(!query||!Array.isArray(rows)||!rows.length)return rows;
  return [...query.matchAll(/gregorian_month\.eq\.(\d+),gregorian_day\.eq\.(\d+)/g)].map(([,m,d])=>{
    const month=Number(m),day=Number(d),original=backup.find(r=>r.gregorian_month===month&&r.gregorian_day===day);
    const row=rows.find(r=>Number(r.gregorian_month)===month&&Number(r.gregorian_day)===day);
    return {...original,...row,gregorian_month:month,gregorian_day:day};
  });
};
