const KEY = "venom-hunter-system-v1";
const RANKS = [
  {name:"E-RANK",letter:"E",xp:0},
  {name:"D-RANK",letter:"D",xp:100},
  {name:"C-RANK",letter:"C",xp:250},
  {name:"B-RANK",letter:"B",xp:500},
  {name:"A-RANK",letter:"A",xp:900},
  {name:"S-RANK",letter:"S",xp:1500}
];
const QUESTS = [
  {id:"commit",icon:"⌘",title:"SHIP A BUILD",desc:"Finish a useful coding task and push a commit to one of your repositories.",reward:40,gold:15},
  {id:"debug",icon:"⌁",title:"ELIMINATE A BUG",desc:"Reproduce, isolate and fix one issue in a project.",reward:35,gold:12},
  {id:"review",icon:"⌕",title:"SCOUT THE CODE",desc:"Review a pull request, inspect an unfamiliar codebase or improve documentation.",reward:30,gold:10},
  {id:"learn",icon:"✧",title:"ACQUIRE A SKILL",desc:"Spend focused time learning a tool, language or engineering concept.",reward:30,gold:10},
  {id:"deploy",icon:"↗",title:"DEPLOY THE GATE",desc:"Deploy a project, improve its monitoring or verify a production workflow.",reward:50,gold:20}
];
const defaults = {
  level:1,xp:0,totalXp:0,gold:100,statPoints:0,
  stats:{str:5,agi:5,int:5,vit:5},
  hp:100,maxHp:100,mana:50,maxMana:50,potions:2,
  quests:{},shadows:[],
  dungeon:{active:false,cleared:false,bossHp:180,bossMaxHp:180,turn:0}
};
function clone(value){return JSON.parse(JSON.stringify(value));}
function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(!saved)return clone(defaults);
    return {...clone(defaults),...saved,stats:{...defaults.stats,...(saved.stats||{})},quests:saved.quests||{},shadows:saved.shadows||[],dungeon:{...defaults.dungeon,...(saved.dungeon||{})}};
  }catch(_){return clone(defaults);}
}
let state=load();
const $=id=>document.getElementById(id);
function save(silent){
  try{localStorage.setItem(KEY,JSON.stringify(state));if(!silent)toast("PROGRESS SAVED LOCALLY");}
  catch(_){toast("SAVE FAILED — CHECK BROWSER STORAGE");}
}
function toast(message){
  const el=$("toast");el.textContent=message;el.classList.add("show");
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2300);
}
function xpGoal(){return 100+(state.level-1)*50;}
function rankIndex(){let i=0;RANKS.forEach((r,n)=>{if(state.totalXp>=r.xp)i=n;});return i;}
function addXP(amount){
  state.xp+=amount;state.totalXp+=amount;
  while(state.xp>=xpGoal()){
    state.xp-=xpGoal();state.level+=1;state.statPoints+=2;
    state.maxHp+=5;state.maxMana+=3;state.hp=state.maxHp;state.mana=state.maxMana;
    logBattle("LEVEL UP — YOU REACHED LEVEL "+state.level+". +2 ATTRIBUTE POINTS.");
  }
}
function logBattle(message){
  const el=$("battleLog");const p=document.createElement("p");const label=document.createElement("span");label.textContent="SYSTEM ";p.append(label,document.createTextNode(message));el.prepend(p);
  while(el.children.length>8)el.removeChild(el.lastChild);
}
function render(){
  const r=RANKS[rankIndex()];
  $("levelValue").textContent=String(state.level).padStart(2,"0");
  $("xpValue").textContent=state.xp;$("xpGoal").textContent=xpGoal();
  $("xpBar").style.width=Math.min(100,state.xp/xpGoal()*100)+"%";
  $("rankBadge").textContent=r.letter;$("rankName").textContent=r.name+" HUNTER";
  $("goldValue").textContent=state.gold;$("pointsValue").textContent=state.statPoints;
  $("questValue").textContent=Object.values(state.quests).filter(Boolean).length;
  $("questTabCount").textContent=String(QUESTS.length).padStart(2,"0");
  $("totalXp").textContent=state.totalXp;
  renderAttributes();renderQuestLists();renderRanks();renderShadows();renderDungeon();renderInventory();
}
function renderAttributes(){
  const labels={str:"STR",agi:"AGI",int:"INT",vit:"VIT"};
  $("attributeList").innerHTML=Object.keys(labels).map(key=>{
    const value=state.stats[key];const max=30;
    return '<div class="attribute-row"><span class="attribute-name">'+labels[key]+'</span><div class="attribute-track"><div class="attribute-fill" style="width:'+Math.min(100,value/max*100)+'%"></div></div><span class="attribute-value">'+value+'</span><button class="plus-btn" data-stat="'+key+'" aria-label="Increase '+labels[key]+'" '+(state.statPoints<1?'disabled':'')+'>+</button></div>';
  }).join("");
}
function renderQuestLists(){
  const mini=QUESTS.slice(0,3);
  $("overviewQuests").innerHTML=mini.map(q=>{
    const done=!!state.quests[q.id];
    return '<div class="mini-quest '+(done?'done':'')+'"><b>'+(done?'✓ ':'')+q.title+'</b><small>'+(done?'CLAIMED':'+'+q.reward+' XP')+'</small></div>';
  }).join("");
  $("questBoard").innerHTML=QUESTS.map(q=>{
    const done=!!state.quests[q.id];
    return '<article class="quest-card '+(done?'complete':'')+'"><div class="quest-icon">'+q.icon+'</div><div><h3>'+q.title+'</h3><p>'+q.desc+'</p></div><div class="quest-reward">+'+q.reward+' XP<br>+'+q.gold+' G</div><button class="btn '+(done?'btn-ghost':'btn-primary')+'" data-quest="'+q.id+'" '+(done?'disabled':'')+'>'+(done?'CLEARED':'CLAIM')+'</button></article>';
  }).join("");
}
function renderRanks(){
  const current=rankIndex();
  $("rankTrack").innerHTML=RANKS.map((r,i)=>{
    return '<div class="rank-step '+(i===current?'current':i<current?'unlocked':'')+'"><strong>'+r.letter+'</strong><span>'+r.name+'</span><span>'+r.xp+' XP</span></div>';
  }).join("");
}
function renderShadows(){
  if(!state.shadows.length){$("overviewShadows").innerHTML='<div class="empty-state">NO SHADOW UNITS YET.<br>DEFEAT THE DUNGEON BOSS TO RECRUIT YOUR FIRST SOLDIER.</div>';return;}
  $("overviewShadows").innerHTML=state.shadows.map(s=>'<div class="shadow-unit"><div class="shadow-icon">♜</div><div><b>'+s.name+'</b><small>'+s.title+' · SHADOW LEGION</small></div></div>').join("");
}
function renderDungeon(){
  const d=state.dungeon;
  $("bossHpText").textContent=Math.max(0,d.bossHp)+" / "+d.bossMaxHp;
  $("bossHpBar").style.width=Math.max(0,d.bossHp/d.bossMaxHp*100)+"%";
  $("hpText").textContent=state.hp+" / "+state.maxHp;$("hpBar").style.width=state.hp/state.maxHp*100+"%";
  $("manaText").textContent=state.mana+" / "+state.maxMana;$("manaBar").style.width=state.mana/state.maxMana*100+"%";
  $("potionCount").textContent=state.potions+" LEFT";
  $("dungeonStatus").innerHTML="<i></i> "+(d.cleared?"BOSS DEFEATED":d.active?"COMBAT ACTIVE":"GATE OPEN");
  $("startDungeonBtn").textContent=d.active?"ENCOUNTER IN PROGRESS →":d.cleared?"REOPEN DUNGEON →":"INITIALIZE ENCOUNTER →";
  $("startDungeonBtn").disabled=d.active;
  $("attackBtn").disabled=!d.active||d.bossHp<=0;
  $("skillBtn").disabled=!d.active||d.bossHp<=0||state.mana<15;
  $("potionBtn").disabled=!d.active||state.potions<1||state.hp>=state.maxHp;
}
function renderInventory(){
  $("inventoryGrid").innerHTML=
    '<article class="item-card"><div class="item-icon">✚</div><h3>HEALTH POTION</h3><p>Restores 45 HP during a dungeon encounter.</p><span class="item-count">QUANTITY: '+state.potions+'</span><p><button class="btn btn-ghost" data-buy-potion>BUY POTION · 30 G</button></p></article>'+
    '<article class="item-card"><div class="item-icon">✦</div><h3>MANA CORE</h3><p>Mana regenerates by 5 after each successful turn.</p><span class="item-count">'+state.mana+' / '+state.maxMana+' MP</span></article>'+
    '<article class="item-card"><div class="item-icon">◈</div><h3>GOLD</h3><p>Dungeon reward currency. More encounters, more gold.</p><span class="item-count">BALANCE: '+state.gold+' G</span></article>';
}
function completeQuest(id){
  const q=QUESTS.find(item=>item.id===id);if(!q||state.quests[id])return;
  state.quests[id]=true;state.gold+=q.gold;addXP(q.reward);save(true);render();toast("QUEST CLEARED · +"+q.reward+" XP");
}
function allocate(key){
  if(state.statPoints<1)return;
  state.stats[key]+=1;state.statPoints-=1;
  if(key==="vit"){state.maxHp+=4;state.hp+=4;}
  if(key==="int"){state.maxMana+=3;state.mana+=3;}
  save(true);render();toast(key.toUpperCase()+" INCREASED");
}
function startDungeon(){
  const d=state.dungeon;if(d.active)return;
  if(d.cleared){d.bossHp=d.bossMaxHp;d.cleared=false;}
  if(state.hp<25){state.hp=Math.min(state.maxHp,state.hp+35);toast("EMERGENCY RECOVERY · +35 HP");}
  d.active=true;d.turn=0;logBattle("ENCOUNTER INITIALIZED. THE NULL WARDEN IS HOSTILE.");render();save(true);
}
function enemyTurn(){
  const d=state.dungeon;if(!d.active)return;
  const base=8+Math.floor(Math.random()*10);
  const damage=Math.max(3,base-Math.floor(state.stats.vit/3));
  state.hp=Math.max(0,state.hp-damage);
  state.mana=Math.min(state.maxMana,state.mana+5);
  logBattle("NULL WARDEN STRIKES FOR "+damage+" DAMAGE. +5 MP REGENERATED.");
  if(state.hp<=0){
    d.active=false;d.bossHp=d.bossMaxHp;state.hp=Math.max(1,Math.ceil(state.maxHp*.35));
    logBattle("YOU WERE DEFEATED. RECOVERY PROTOCOL RESTORED 35% HP. BOSS RESET.");
    toast("DUNGEON FAILED · REGROUP AND TRY AGAIN");
  }
}
function winDungeon(){
  const d=state.dungeon;d.active=false;d.cleared=true;d.bossHp=0;
  state.gold+=80;addXP(150);
  if(!state.shadows.some(s=>s.name==="IGRIS"))state.shadows.push({name:"IGRIS",title:"ELITE KNIGHT"});
  logBattle("BOSS DEFEATED. +150 XP · +80 GOLD · SHADOW RECRUITED: IGRIS.");
  toast("DUNGEON CLEARED · SHADOW ARMY EXPANDED");
}
function playerAttack(skill){
  const d=state.dungeon;if(!d.active||d.bossHp<=0)return;
  let damage;
  if(skill){
    if(state.mana<15)return;
    state.mana-=15;damage=state.stats.int*4+Math.floor(Math.random()*13)+8;
    const critical=Math.random()<Math.min(.35,state.stats.agi*.01);if(critical)damage*=2;
    logBattle("MANA STRIKE "+(critical?"CRITICAL ":"")+"DEALS "+damage+" DAMAGE.");
  }else{
    damage=state.stats.str*2+Math.floor(Math.random()*10)+5;
    const critical=Math.random()<Math.min(.35,state.stats.agi*.01);if(critical)damage*=2;
    logBattle("BASIC ATTACK "+(critical?"CRITICAL ":"")+"DEALS "+damage+" DAMAGE.");
  }
  d.bossHp=Math.max(0,d.bossHp-damage);d.turn+=1;
  if(d.bossHp<=0){winDungeon();}
  else enemyTurn();
  save(true);render();
}
function buyPotion(){
  if(state.gold<30){toast("NOT ENOUGH GOLD · NEED 30 G");return;}
  state.gold-=30;state.potions+=1;save(true);render();toast("HEALTH POTION ACQUIRED");
}
function usePotion(){
  if(!state.dungeon.active||state.potions<1||state.hp>=state.maxHp)return;
  state.potions-=1;const restored=Math.min(45,state.maxHp-state.hp);state.hp+=restored;
  logBattle("HEALTH POTION USED. +"+restored+" HP.");enemyTurn();save(true);render();
}
document.addEventListener("click",event=>{
  const tab=event.target.closest("[data-tab]");
  if(tab){const name=tab.dataset.tab;document.querySelectorAll(".tab").forEach(el=>el.classList.toggle("active",el.dataset.tab===name));document.querySelectorAll(".tab-view").forEach(el=>{const active=el.id==="tab-"+name;el.classList.toggle("active",active);el.hidden=!active;});return;}
  const quest=event.target.closest("[data-quest]");if(quest){completeQuest(quest.dataset.quest);return;}
  const stat=event.target.closest("[data-stat]");if(stat){allocate(stat.dataset.stat);return;}
  const buy=event.target.closest("[data-buy-potion]");if(buy){buyPotion();return;}
});
$("startDungeonBtn").addEventListener("click",startDungeon);
$("attackBtn").addEventListener("click",()=>playerAttack(false));
$("skillBtn").addEventListener("click",()=>playerAttack(true));
$("potionBtn").addEventListener("click",usePotion);
$("saveBtn").addEventListener("click",()=>save(false));
$("resetBtn").addEventListener("click",()=>{
  if(!confirm("Reset all Hunter System progress stored in this browser? This cannot be undone."))return;
  state=clone(defaults);localStorage.removeItem(KEY);$("battleLog").innerHTML="<p><span>SYSTEM</span> Save data cleared. New hunter initialized.</p>";render();toast("SYSTEM RESET COMPLETE");
});
render();
