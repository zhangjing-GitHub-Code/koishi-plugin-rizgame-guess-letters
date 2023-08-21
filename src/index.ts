import { Context, Schema } from 'koishi'

export const name = 'rizgame-guess-letters'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

declare module 'koishi' {
  interface Channel {
      letterGameStatus: object
    }
}

export async function apply(ctx: Context) {
  // write your plugin here
  ctx.model.extend('channel', {
    // 向用户表中注入字符串字段 foo
    //letterGameStatus : 'string'
	  //     // 你还可以配置默认值为 'bar'
    letterGameStatus : { type: 'json', initial: { isInGame: false, gameStatus: {} } }
  });
  ctx.command("guess <letter:string>").action(async (_,letter)=>{
    if(_.session.isDirect)return "请在群聊里进行游戏！";
    let stat=await ctx.database.get('channel', {id:[_.session.channelId]},['letterGameStatus']);
    console.log(stat);

  })
}
