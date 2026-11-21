"use strict";
window.KrakenBasket = (() => {
  const KEY = "kraken_basket_v1";
  const validId = id => typeof id === "string" && id.length > 0 && id.length <= 160 && /^[a-zA-Z0-9_-]+$/.test(id);
  const read = () => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(data) ? data.filter(x => x?.type === "course" && validId(x.id)).slice(0,30) : [];
    } catch { return []; }
  };
  const emit = () => window.dispatchEvent(new Event("kraken:basket"));
  const save = items => { localStorage.setItem(KEY, JSON.stringify(items)); emit(); };
  const addCourse = course => {
    if (!course?.id || !validId(course.id) || course.access_type !== "paid" || !(Number(course.price_pence)>0)) return false;
    const items=read();
    if(items.some(x=>x.id===course.id))return true;
    if(items.length>=30)return false;
    items.push({type:"course",id:course.id});
    save(items);return true;
  };
  return {read,addCourse,remove:id=>save(read().filter(x=>x.id!==id)),clear:()=>save([])};
})();
