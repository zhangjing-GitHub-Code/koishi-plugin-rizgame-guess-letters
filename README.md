# koishi-plugin-rizgame-guess-letters

[![npm](https://img.shields.io/npm/v/koishi-plugin-rizgame-guess-letters?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-rizgame-guess-letters)

### 音游开字母 for koishi~

# 安装/配置

从插件市场搜索安装
提供开始游戏时，随机的曲目数配置

# 使用插件

> Tips: 所有`<曲名>`如果有空格都可以(必须)用英文 "" 括起来  
> `<xxx]` 表示贪婪匹配（不用括起来，是最后一个参数）

## 游戏中

### 开字母

- `rgl.guess <字母>` aka.开  
开一个字母

### 猜曲名

- `rgl.song <序号> <曲名]` aka.曲  
指出对应编号曲名应为什么

## 管理



### 开始游戏: 私/群

- `rgl.start [群号]` aka.开始开字母  
在当前或指定群开始游戏

### 停止游戏: 私/群

- `rgl.stop [群号]` aka.停止开字母

### 添加歌曲: 私

- `rgl.addsong <曲名> [难度: 正整数]` aka.添加歌曲  
为曲库添加歌曲，只能在私聊使用

### 查看歌曲: 私

- `rgl.listsong` aka.查看歌曲 aka. 列出歌曲  
列出数据库内歌曲

### 删除歌曲: 私

- `rgl.rmsong <曲名]` aka.删除歌曲
删除所有与 `曲名` 全小写 匹配的歌曲
> 举例：
> ```
> #  id     name
>    1     Bonus timE
>    2     BONus TIme
> ```
> \> rgl.rmsong bonUS TIME  
> \< 删除歌曲 id:1 Name:Bonus timE  
> \< 删除歌曲 id:2 Name:BONus TIme  

权限限制WIP，如果曲库要开箱即用跟我提，欢迎PR更多功能！