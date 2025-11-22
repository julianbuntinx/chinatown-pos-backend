export default function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({success:false});
  const b=req.body||{},ok=b.location&&b.customer_name&&b.customer_phone&&b.items&&b.items.length;
  if(!ok)return res.status(400).json({success:false});
  const id="TEST-"+Date.now();
  const eta=b.pickup_time&&b.pickup_time!=="ASAP"?b.pickup_time:"20-25 minutes";
  return res.status(200).json({success:true,order_id:id,estimated_ready_time:eta});
}

