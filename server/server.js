import { WebSocketServer } from 'ws';
import http from 'http';
import crypto from 'crypto';

const PORT = process.env.PORT || 8080;
const players = new Map();
const server = http.createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});
  res.end('Arelia Online multiplayer server is running.\n');
});
const wss = new WebSocketServer({server});

function snapshot(){
  const out={};
  for(const [id,p] of players) out[id]={id,name:p.name,cls:p.cls,x:p.x,y:p.y};
  return out;
}
function broadcast(data,except=null){
  const text=JSON.stringify(data);
  for(const [id,p] of players){
    if(id!==except && p.ws.readyState===1) p.ws.send(text);
  }
}

wss.on('connection',ws=>{
  const id=crypto.randomUUID();
  const p={id,ws,name:'Adventurer',cls:'warrior',x:1700,y:700};
  players.set(id,p);
  ws.send(JSON.stringify({type:'welcome',id,players:snapshot()}));
  broadcast({type:'players',players:snapshot()});

  ws.on('message',raw=>{
    try{
      const m=JSON.parse(raw.toString());
      if(m.type==='join'){
        p.name=String(m.name||'Adventurer').slice(0,18);
        p.cls=['warrior','mage','rogue'].includes(m.cls)?m.cls:'warrior';
        p.x=Number.isFinite(m.x)?m.x:p.x; p.y=Number.isFinite(m.y)?m.y:p.y;
        broadcast({type:'chat',name:'System',text:p.name+' joined the world'});
        broadcast({type:'players',players:snapshot()});
      }else if(m.type==='state'){
        p.name=String(m.name||p.name).slice(0,18); p.cls=m.cls||p.cls;
        p.x=Number.isFinite(m.x)?m.x:p.x; p.y=Number.isFinite(m.y)?m.y:p.y;
        broadcast({type:'players',players:snapshot()});
      }else if(m.type==='chat'){
        const text=String(m.text||'').trim().slice(0,120);
        if(text) broadcast({type:'chat',name:p.name,text});
      }
    }catch{}
  });
  ws.on('close',()=>{
    players.delete(id);
    broadcast({type:'chat',name:'System',text:p.name+' left the world'});
    broadcast({type:'players',players:snapshot()});
  });
});

server.listen(PORT,()=>console.log(`Arelia Online server listening on port ${PORT}`));
