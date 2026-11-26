"use strict";
window.KrakenBasket = (() => {
  const KEY = "kraken_basket_v1";
  const validId = id => typeof id === "string" && id.length > 0 && id.length <= 160 && /^[a-zA-Z0-9_-]+$/.test(id);
  const read = () => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(data) ? data.filter(x => ["course","resource"].includes(x?.type) && validId(x.id)).slice(0,30) : [];
    } catch { return []; }
  };
  const emit = () => window.dispatchEvent(new Event("kraken:basket"));
  const save = items => { localStorage.setItem(KEY, JSON.stringify(items)); emit(); };
  const add = (course,type) => {
    if (!course?.id || !validId(course.id) || course.access_type !== "paid" || !(Number(course.price_pence)>0)) return false;
    const items=read();
    if(items.some(x=>x.id===course.id && x.type===type))return true;
    if(items.length>=30)return false;
    items.push({type,id:course.id});
    save(items);return true;
  };
  return {read,addCourse:c=>add(c,"course"),addResource:r=>add(r,"resource"),remove:(id,type)=>save(read().filter(x=>x.id!==id || (type && x.type!==type))),clear:()=>save([])};
})();
