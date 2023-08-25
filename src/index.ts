import { Context, Logger, Random, Schema, Session,h } from 'koishi'

export const name = 'rizgame-guess-letters'

export interface Config {
  randSongMode: string,
  startValue?: number,
  endValue?: number,
  value?: number
}

export const Config: Schema<Config> = //Schema.object({});
/* Schema.intersect([
  Schema.object({
    test: Schema.number(),
    randSongMode: Schema.union(['range','fullrandom','fixed']).required(), //.description('随机曲目个数设置')
  }).description('配置'),
  Schema.union([
    Schema.object({
      randSongMode: Schema.const('range').required(),
      startValue: Schema.number(),
      endValue: Schema.number()
    }).description('范围随机'),
    Schema.object({
      randSongMode: Schema.const('fullrandom').required(),
    }).description('完全随机'),
    Schema.object({
      randSongMode: Schema.const('fixed').required(),
      value: Schema.number()
    }).description('指定个数'),
  ]),
]);*/

/*export default */Schema.intersect([
  Schema.object({
    test: Schema.number(),
    randSongMode: Schema.union(['range','fullrandom','fixed']).required().description('随机曲目个数设置'),
  }).description('配置'),
  Schema.union([
    Schema.object({
      randSongMode: Schema.const('range').required(),
      startValue: Schema.number().default(5)
      .description('最少几首曲子'),
      endValue: Schema.number().default(8)
      .description('最多几首曲子'),
    }).description('范围随机'),
    Schema.object({
      randSongMode: Schema.const('fullrandom').required(),
    }).description('完全随机'),
    Schema.object({
      randSongMode: Schema.const('fixed').required(),
      value: Schema.number().required().default(8)
      .description('选几个曲子')
    }).description('指定个数'),
  ]),
]);

declare module 'koishi' {
  interface Channel {
      letterGameStatus: { 
        isInGame: boolean, 
        gameStatus: { 
          guessedLetters?: string[], 
          songs: string[], 
          guessedSids?: number[]
          //currAns:""
        } 
      }
    }
  interface Tables{
    songlist: SongList
  }
}

export interface SongList{
  id: number
  name: string
  hardness: number
}

export async function outputGuessStatus(sess: Session,stat){
  //if(!stat["isInGame"])return;
  let fintext="当前已开字母: ";
  stat["guessedLetters"].forEach(element => {
    fintext+=element+",";
  });
  if(stat["guessedLetters"].length==0)fintext+="无";
  else fintext=fintext.slice(0,-1);
  fintext+="\n";
  let cid=0;
  let misGuess:number[]=[];
  stat["songs"].forEach((songN:String) => {
    cid++;
    let tmpsong=cid+". ";
    //console.log(songN);
    //songN.array.forEach(ch => {
    let allGuess=true;
    let alguess=false;
    if(stat["guessedSids"].indexOf(cid)!=-1)alguess=true;
    //let cmpSN=songN.toLowerCase();
    for(let i=0;i<songN.length;++i){
      let ch=songN[i];
      if(ch==" "){
        tmpsong+=ch;
      }else if(stat["guessedLetters"].indexOf(ch.toLowerCase())==-1&&!alguess){
        tmpsong+="*";
        allGuess=false;
      }else tmpsong+=ch;
    }
    if(allGuess==true&&/*stat["guessedSids"].indexOf(cid)==-1*/!alguess){ // all guess out, but not typed out
      stat["guessedSids"].push(cid);
      misGuess.push(cid);
    }
    if(stat["guessedSids"].indexOf(cid)!=-1){ // output guess out sign
      tmpsong+=" [√]";
    }
    //});
    fintext+=tmpsong+"\n";
  });
  sess.sendQueued(fintext);
  // TODO: Mis guess punishment
}

export async function apply(ctx: Context,cfg: Config) {
  // write your plugin here
  var logr=new Logger("rizgame-guess-letters");
  // extend channel game status
  ctx.model.extend('channel', {
    // 向用户表中注入字符串字段 foo
    //letterGameStatus : 'string'
	  //     // 你还可以配置默认值为 'bar'
    letterGameStatus : { type: 'json', initial: { 
      isInGame: false, 
      gameStatus: { 
        guessedLetters:[], 
        songs:[], 
        guessedSids:[]
        //currAns:""
      } 
    }}
  });
  // extend songlist table
  ctx.model.extend('songlist', {
  // segment types
  id: 'unsigned',
  name: 'string',
  hardness: 'float'
}, {
  // use AUTO_INCREMENT
  autoInc: true,
})
  // Guess a letter UwU
  ctx.command("rgl.guess <letter:string>").action(async (_,letter)=>{
    if(_.session.isDirect)return "请在群聊里进行游戏！";
    let stat_a=await ctx.database.get('channel', {id:[_.session.channelId]},['letterGameStatus']);
    let stat=stat_a[0]["letterGameStatus"];//["letterGameStatus"];
    //console.log(stat);
    //_.session.sendQueued(stat);
    //console.log(stat.isInGame,typeof(stat.isInGame))
    if(stat["isInGame"]!=true)return "该群聊未开始游戏，请";
    if(letter.length>1)return "您猜的不止一个字母嗷";
    //IIRFilterNode
    if(letter.length<1)return "您啥也没猜捏~";
    letter=letter.toLowerCase();
    if(stat["gameStatus"]["guessedLetters"].indexOf(letter[0])!=-1){
      return "当前字母'"+letter[0]+"'已开过，请换一个！";
    }
    stat["gameStatus"]["guessedLetters"].push(letter[0]);
    //console.log(stat_a);
    // Post outputs
    await ctx.database.setChannel(_.session.platform,_.session.channelId,stat_a[0]);
    outputGuessStatus(_.session as Session,stat["gameStatus"]);
  }).shortcut("开");
  // type to <<decrypt>> the song name
  ctx.command("rgl.song <sid:number> <sn:text>").action(
  async (_,sid:number,sn:string)=>{
    if(_.session.isDirect)return "请在群聊里进行游戏！";
    let stat_a=await ctx.database.get('channel', {id:[_.session.channelId]},['letterGameStatus']);
    let stat=stat_a[0]["letterGameStatus"];//["letterGameStatus"];
    //console.log(stat);
    //_.session.sendQueued(stat);
    //console.log(stat.isInGame,typeof(stat.isInGame))
    if(stat["isInGame"]!=true)return "该群聊未开始游戏，请";
    if(sn.length>100)return "您猜的太长了，不像一个歌名";
    //IIRFilterNode
    if(sn.length<1||(sid==undefined||sn==undefined))return "您啥也没猜捏~";
    if(stat["gameStatus"]["guessedSids"].indexOf(sid)!=-1){
      return "当前歌曲id "+sid+" 已猜出，请换一个！";
    }
      console.log(_.name,_.session.author,await _.session.getUser(),_.session.userId);
    let guecomp=sn.toLowerCase();
    let findG=false;
    stat["gameStatus"]["songs"].forEach(nsn => {
      let comp=nsn as string;
      let rcomp=comp.toLowerCase();
      if(rcomp==guecomp)findG=true;
    });
    if(findG){
      stat["gameStatus"]["guessedSids"].push(sid);
      _.session.sendQueued("恭喜猜出歌曲 "+sn+" ！");
      if(stat["gameStatus"]["guessedSids"].length==stat["gameStatus"]["songs"].length){
        // guessed all out
        stat["isInGame"]=false;
        stat["gameStatus"]["guessedLetters"]=[];
        stat["gameStatus"]["guessedSids"]=[];
        stat["gameStatus"]["songs"]=[];
        await ctx.database.setChannel(_.session.platform,_.session.channelId,stat_a[0]);
        //let endmsg="恭喜猜出全部歌曲！最后一个人是 <at id='"+_.session.platform+":"+_.session.userId+"' />";
        let endmsg="恭喜猜出全部歌曲！最后一个人是 "+h('a',{ id: _.session.userId });
        _.session.sendQueued("恭喜猜出全部歌曲！最后一个人是 "+h('a',{ id: _.session.userId }));
        console.log(endmsg);
        return;
      }
      await ctx.database.setChannel(_.session.platform,_.session.channelId,stat_a[0]);
      // TODO: add award
    }else{
      _.session.sendQueued("抱歉，您没猜出曲名！");
    }
    console.log(stat_a);
    // Post outputs
    outputGuessStatus(_.session as Session,stat["gameStatus"]);
  }).shortcut("曲");
  // Add songs
  ctx.command("rgl.addsong <sn:string> [hardness:number]").action(async (_,sn,hd)=>{
    if(!_.session.isDirect)return;
    if(sn==undefined)return "缺失曲名，无法添加";
    console.log(sn);
    console.log(hd);
    if(hd==undefined||hd==0){
      hd=1;
      if(sn.length>18)hd++; // long names
      if(sn.length<5)hd++; // short out-of-thought answers
      let re_ULetter=/[A-Z]/g; // Upper case letters
      let re_special=/[A-Za-z0-9!@#$%^&*()~`+-=_\\/\[\].,<>°²]/g; // some special characters
      let re_spc_chn=/[《》。，？！…￥【】；：‘’“”、]/g; // Chinese symbols
      let re_cnch_rv=/[A-Za-z0-9!@#$%^&*()~`+-=_\\/\[\].,<>°²《》。，？！…￥【】；：‘’“”、]/g;
      if(sn.search(re_ULetter)!=-1)hd++;
      if(sn.search(re_special)!=-1)hd++;
      if(sn.search(re_spc_chn)!=-1)hd+=2;
      if(sn.search(re_cnch_rv)==-1)hd+=3;
      _.session.sendQueued("未指定难度，推测为: "+hd);
    }
    let stat_a=await ctx.database.get('songlist', {name:[sn]},['id']);
    //console.log(stat_a);
    if(stat_a.length>0)return "歌曲已添加过，id: "+stat_a[0]["id"];
	try{
	await ctx.database.create('songlist',{ hardness:hd, name:sn});
	}catch(e:any){
		logr.error("Database song add fail: "+e);
		return "添加失败！请查看日志";
	}
    //let stat=stat_a[0]["letterGameStatus"];//["letterGameStatus"];
  }).shortcut("添加歌曲");
  // List songs
  ctx.command("rgl.listsong").action(async (_)=>{
    if(!_.session.isDirect)return;
    let stat_a=await ctx.database.get('songlist', { id : { $gte: 0 }},['name']);
    //console.log(stat_a);
    //let songs=[];
    let retans="数据库内歌曲："
    stat_a.forEach((kv)=>{
      retans+="\n"+kv["name"];
    });
	_.session.sendQueued(retans);
    //let stat=stat_a[0]["letterGameStatus"];//["letterGameStatus"];
  }).shortcut("查看歌曲").shortcut("列出歌曲");
  ctx.command("rgl.start [channelId:string]").action(async (_,gid)=>{
    if(_.session.isDirect&&gid==undefined)return "请在群聊调用或指定 channelId!";
    if(gid==undefined||gid.length<2)gid=_.session.channelId;
	let ginfo=await ctx.database.get('channel', {id:[gid]},['letterGameStatus']);
    //console.log(ginfo);
  let stat=ginfo[0]["letterGameStatus"];
    // DEBUG PURPOSE
    if(stat["isInGame"])return "该群组已开始进行游戏！";
    stat["isInGame"]=true;
    let stat_a=await ctx.database.get('songlist',{id:{ $gte:0 }},['name']);
	let songs=[];
	stat_a.forEach((kv)=>{
		songs.push(kv["name"]);
	});
    //let finSongs=[]
    let finalSC=0;
    if(cfg.randSongMode=='range'){
      finalSC=Random.int(cfg.startValue,Math.min(cfg.endValue,songs.length));
    }else if(cfg.randSongMode=='fullrandom'){
      finalSC=Random.int(Math.min(songs.length,3),songs.length);
    }else if(cfg.randSongMode=='fixed'){
      finalSC=cfg.value;
    }
    let finSongs=Random.pick(songs,finalSC);
    stat["gameStatus"]["songs"]=finSongs;
    console.log(ginfo);
    _.session.bot.sendMessage(gid,"已随机"+finalSC+"个曲子");
    // Post output
    await ctx.database.setChannel(_.session.platform,gid,ginfo[0]);
    outputGuessStatus(_.session as Session,stat["gameStatus"]);
	//let stat=stat_a[0]["letterGameStatus"];//["letterGameStatus"];
  }).shortcut("开始开字母");
  ctx.command("rgl.stop [channelId:string]").action(async (_,gid)=>{
    if(_.session.isDirect&&gid==undefined)return "请在群聊调用或指定 channelId!";
    if(gid==undefined||gid.length<2)gid=_.session.channelId;
	let ginfo=await ctx.database.get('channel', {id:[gid]},['letterGameStatus']);
    //console.log(ginfo);
  let stat=ginfo[0]["letterGameStatus"];
    // DEBUG PURPOSE
    if(!stat["isInGame"])return "该群组并未进行游戏！";
    stat["isInGame"]=false;
    stat["gameStatus"]["songs"]=[];
    stat["gameStatus"].guessedLetters=[];
    stat.gameStatus.guessedSids=[];
    console.log(ginfo);
    _.session.bot.sendMessage(gid,"已结束游戏！");
    // Post output
    await ctx.database.setChannel(_.session.platform,gid,ginfo[0]);
	//let stat=stat_a[0]["letterGameStatus"];//["letterGameStatus"];
  }).shortcut("停止开字母");
  logr.info("plugin register finish.");
}
