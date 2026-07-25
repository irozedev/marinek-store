const { createClient } = require('@supabase/supabase-js');
const db = createClient('https://cdkexaplxybsldondifk.supabase.co','sb_secret_nGc9wm31PbXKhZrg-dECoA_QvZY4Ivl',{auth:{persistSession:false}});
(async()=>{
  for(let i=0;i<120;i++){
    const {data}=await db.from('orders').select('order_reference,plan,amount,currency,status,email,invite_link,paid_at,email_sent_at').neq('status','pending');
    if(data&&data.length){
      for(const r of data){
        console.log(`ОПЛАЧЕНО: ${r.order_reference}  ${r.plan}  ${r.amount} ${r.currency}`);
        console.log(`  статус=${r.status}  пошта=${r.email}`);
        console.log(`  інвайт=${r.invite_link}`);
        console.log(`  лист=${r.email_sent_at||'не відправлений'}`);
      }
      process.exit(0);
    }
    await new Promise(r=>setTimeout(r,15000));
  }
  console.log('за 30 хвилин оплати не було');
})();
