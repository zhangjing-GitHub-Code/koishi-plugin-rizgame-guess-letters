import { Context, Logger, Schema, Session } from 'koishi'

export const name = 'rizgame-guess-letters'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

declare module 'koishi' {
  interface Channel {
      letterGameStatus: object
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
  let fintext="当前已开字母: ";
  stat["guessedLetters"].forEach(element => {
    fintext+=element+",";
  });
  if(stat["guessedLetters"].length==0)fintext+="无";
  else fintext=fintext.slice(0,-1);
  fintext+="\n";
  let cid=0;
  let misGuess:number[]=[];
  stat["songs"].forEach(songN => {
    cid++;
    let tmpsong=cid+". ";
    //console.log(songN);
    //songN.array.forEach(ch => {
    let allGuess=true;
    let alguess=false;
    if(stat["guessedSids"].indexOf(cid)!=-1)alguess=true;
    for(let i=0;i<songN.length;++i){
      let ch=songN[i];
      if(stat["guessedLetters"].indexOf(ch)==-1&&!alguess){
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

export async function apply(ctx: Context) {
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
    if(stat["gameStatus"]["guessedLetters"].indexOf(letter[0])!=-1){
      return "当前字母'"+letter[0]+"'已开过，请换一个！";
    }
    stat["gameStatus"]["guessedLetters"].push(letter[0]);
    //console.log(stat_a);
    // Post outputs
    await ctx.database.setChannel(_.session.platform,_.session.channelId,stat_a[0]);
    outputGuessStatus(_.session as Session,stat["gameStatus"]);
  });
  // type to <<decrypt>> the song name
  ctx.command("rgl.song <sid:number> <sn:string>").action(
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
    let guecomp=sn.toLowerCase();
    let findG=false;
    stat["gameStatus"]["songs"].forEach(nsn => {
      let comp=nsn as string;
      let rcomp=comp.toLowerCase();
      if(rcomp==guecomp)findG=true;
    });
    if(findG){
      stat["gameStatus"]["guessedSids"].push(sid);
    }
    console.log(stat_a);
    // Post outputs
    await ctx.database.setChannel(_.session.platform,_.session.channelId,stat_a[0]);
    outputGuessStatus(_.session as Session,stat["gameStatus"]);
  });
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
      let re_special=/[]/g; // some special characters
      let re_spc_chn=/[]/g; // Chinese symbols
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
  });
  ctx.command("rgl.start [guildId:number]").action(async (_,gid)=>{
    if(_.session.isDirect&&gid==undefined)return "请在群聊调用或指定guildId!";
	let ginfo=await ctx.database.get('channel', {id:[_.session.channelId]},['letterGameStatus']);
    //console.log(ginfo);
  let stat=ginfo[0]["letterGameStatus"];
    // DEBUG PURPOSE
    if(stat["isInGame"])return "该群组已开始进行游戏！";
    stat["isInGame"]=true;
    let stat_a=await ctx.database.get('songlist',{id:{ $gte:0 }},['name']);
    //console.log(stat_a);
	await ctx.database.setChannel(_.session.platform,_.session.channelId,ginfo[0]);
    outputGuessStatus(_.session as Session,stat["gameStatus"]);
	//let stat=stat_a[0]["letterGameStatus"];//["letterGameStatus"];
  });
}
