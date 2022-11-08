const { Telegraf } = require('telegraf');
const { bot_token, admin_id } = require('./config.js');
const util = require('util');
const fs = require("fs");
const fetch = require("node-fetch");
const bot = new Telegraf(bot_token);
const client = bot.telegram;
const { color, bgColor } = require('./lib/color');
const { nowm, getVideoMeta } = require('./lib/tiktok');
const { tools } = require("caliph-api");
const express = require("express");
const serve = express();
const PORT = process.env.PORT || 3030;

let connected = false;

function isUrl(url) {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}
function isValidTiktokUrl(url) {
    if (!url) return false;
    let delete_query = url.split('?')[0];
    return delete_query.match(new RegExp(/^(https?:\/\/)?((www\.)?)tiktok\.com\/(@[a-z\d._]+)\/video\/(\d+)$/i));
}
function isValidTiktokUrlShort(url) {
     url = url.endsWith("/") ? url.slice(0, 31) : url;
     url = url.replace("vm.tiktok", "vt.tiktok")
    return url.match(new RegExp(/^(https?:\/\/)?((www\.)?)vt\.tiktok\.com\/(\w+)$/i));
}
function getBuffer(url) {
    return new Promise((resolve, reject) => {
        fetch(url, { headers: { 'User-Agent': 'okhttp/3.12.1' } })
            .then(res => res.buffer())
            .then(buffer => {
                resolve(buffer)
            })
            .catch(err => {
                reject(err)
            })
    })
}
bot.on("callback_query", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.callbackQuery.message.chat.id;
    const messageId = ctx.callbackQuery.message.message_id;
    const userId = ctx.callbackQuery.from.id;
    const username = ctx.callbackQuery.from.username;
    const firstName = ctx.callbackQuery.from.first_name;
    const lastName = ctx.callbackQuery.from.last_name;
    const fullName = firstName + " " + lastName;
    const command = data.split(" ")[0];
    const args = data.split(" ").slice(1);
    
    if (command == "nowm") {
        let before_msg = await client.sendMessage(chatId, "Please wait. downloading video without watermark...", { reply_to_message_id: messageId });
        try {
            await client.answerCbQuery(ctx.callbackQuery.id, "Downloading No WaterMark Video...", true);
            let expan = (await tools.expandurl(args[0].replace("http:", "https:"))).result;
            let data = await nowm(expan);
            let videoInfo = await getVideoMeta(expan);
            let videoUrl = data.nowm;
            let videoName = videoInfo.ID + " - " + videoInfo.Video.id + ".mp4";
            let videoCaption = videoInfo.title;
            let stats = videoInfo.stats;
            let videoStats = `*${stats.diggCount}* Likes, *${stats.commentCount}* Comments, *${stats.shareCount}* Shares`;
            let videoDuration = videoInfo.Video.duration;
            let caption = `*Tiktok No WaterMark*\n\n*Title:* *${videoCaption}*\n*Stats:* ${videoStats}\n*Duration:* ${videoDuration} (s)\n\n*Downloaded by:* @${bot.botInfo.username}`;
            let buffer = await getBuffer(videoUrl);
            await client.sendVideo(chatId, { source: buffer, filename: videoName, caption: caption }, { caption, parse_mode: "Markdown" });
          await client.deleteMessage(chatId, before_msg.message_id);
          await client.deleteMessage(chatId, messageId);
        } catch (err) {
            console.log(err);
            await ctx.reply("Something went wrong. Please try again later.");
        }
    }
    if (command == "wm") {
        let before_msg = await client.sendMessage(chatId, "Please wait. downloading video with watermark...", { reply_to_message_id: messageId });
        await client.answerCbQuery(ctx.callbackQuery.id, "Downloading WaterMark Video...", true);
        try {
            let videoInfo = await getVideoMeta((await tools.expandurl(args[0].replace("http:", "https:"))).result);
            let videoUrl = videoInfo.Video.playAddr;
            let videoName = videoInfo.ID + " - " + videoInfo.Video.id + ".mp4";
            let videoCaption = videoInfo.title;
            let stats = videoInfo.stats;
            let videoStats = `*${stats.diggCount}* Likes, *${stats.commentCount}* Comments, *${stats.shareCount}* Shares`;
            let videoDuration = videoInfo.Video.duration;
            let caption = `*Tiktok WaterMark*\n\n*Title:* ${videoCaption}\n*Stats:* ${videoStats}\n*Duration:* ${videoDuration} (s)\n\n*Downloaded by:* @${bot.botInfo.username}`;
            let buffer = await getBuffer(videoUrl);
            await client.sendVideo(chatId, { source: buffer, filename: videoName }, { caption, parse_mode: "Markdown" });
           await client.deleteMessage(chatId, messageId);
          await client.deleteMessage(chatId, before_msg.message_id);
        } catch (err) {
            console.log(err);
            await ctx.reply("Something went wrong. Please try again later.");
        }
    }

});


bot.on("message", async (ctx) => {
    try {
        let body = ctx.message.text || ctx.message.caption || "";
        let command = body.split(" ")[0].toLowerCase();
        let args = body.split(" ").slice(1);
        let chatId = ctx.chat.id;
        let messageId = ctx.message.message_id;
        let userId = ctx.from.id;
        let isOwner = admin_id.find(({ id }) => id == userId) ? true : false;
        let username = ctx.from.username;
        let firstName = ctx.from.first_name;
        let lastName = ctx.from.last_name;
        let fullName = firstName + " " + lastName;
        let isBot = ctx.from.is_bot;
        let isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
        let isPrivate = ctx.chat.type === "private";
        let isReply = ctx.message.reply_to_message;
        let isForward = ctx.message.forward_from;
        let isMedia = ctx.message.photo || ctx.message.video || ctx.message.audio || ctx.message.document || ctx.message.sticker;
        let isText = ctx.message.text;

        let q = args.join(" ");

        if (isGroup && isText) {
            console.log(`${color("[GROUP]", "yellow")} ${color("[TEXT]", "blue")} ${color("[" + fullName + "]", "green")} in ${color("[" + ctx.chat.title + "]", "green")} : ${color(body, "green")}`);
        } else if (isGroup && isMedia) {
            console.log(`${color("[GROUP]", "yellow")} ${color("[MEDIA]", "blue")} ${color("[" + fullName + "]", "green")} in ${color("[" + ctx.chat.title + "]", "green")} : ${color(body, "green")}`);
        } else if (isGroup && isForward) {
            console.log(`${color("[GROUP]", "yellow")} ${color("[FORWARD]", "blue")} ${color("[" + fullName + "]", "green")} in ${color("[" + ctx.chat.title + "]", "green")} : ${color(body, "green")}`);
        } else if (isGroup && isReply) {
            console.log(`${color("[GROUP]", "yellow")} ${color("[REPLY]", "blue")} ${color("[" + fullName + "]", "green")} in ${color("[" + ctx.chat.title + "]", "green")} : ${color(body, "green")}`);
        } else if (isPrivate && isText) {
            console.log(`${color("[PRIVATE]", "yellow")} ${color("[TEXT]", "blue")} ${color("[" + fullName + "]", "green")} : ${color(body, "green")}`);
        } else if (isPrivate && isMedia) {
            console.log(`${color("[PRIVATE]", "yellow")} ${color("[MEDIA]", "blue")} ${color("[" + fullName + "]", "green")} : ${color(body, "green")}`);
        } else if (isPrivate && isForward) {
            console.log(`${color("[PRIVATE]", "yellow")} ${color("[FORWARD]", "blue")} ${color("[" + fullName + "]", "green")} : ${color(body, "green")}`);
        } else if (isPrivate && isReply) {
            console.log(`${color("[PRIVATE]", "yellow")} ${color("[REPLY]", "blue")} ${color("[" + fullName + "]", "green")} : ${color(body, "green")}`);
        }

        switch (command) {
            case "/start":
                await ctx.replyWithHTML(`Hello <a href="tg://user?id=${userId}">${firstName}</a>\nWelcome to TikTok Downloader Bot!\n\nSend me a TikTok video link to download it.\n\n<b>Bot by @${admin_id[0].username}</b>`, { reply_to_message_id: messageId });
                break;
            case ">":
                if (!isOwner) return ctx.reply("Perintah ini hanya untuk owner bot!", { reply_to_message_id: messageId });
                if (!q) return ctx.reply("Masukkan kode javascript!", { reply_to_message_id: messageId });
                try {
                    let result = eval(`(async () => { ${q} })()`);
                    if (result instanceof Promise) result = await result;
                    if (typeof result !== "string") result = util.inspect(result, { depth: 5 });
                    ctx.reply(result, { reply_to_message_id: messageId });
                } catch (err) {
                    ctx.reply("Error: " + err, { reply_to_message_id: messageId });
                }
                break
            default:
                if (isUrl(body)) {
                    for (let i of isUrl(body)) {
                        let valid_tiktok_url = isValidTiktokUrl(i) || isValidTiktokUrlShort(i);
                        if (valid_tiktok_url) {
                            let before = await ctx.reply("Please wait...", { reply_to_message_id: messageId });
                            let tiktok = await getVideoMeta(i);
                            let image = tiktok.Video.cover;
                            let video_id = tiktok.Video.id;
                            let stats = tiktok.stats;
                            let title = tiktok.title;
                            let author = tiktok.ID;
                            let author_url = "https://www.tiktok.com/" + author;
                            await client.deleteMessage(chatId, before.message_id);
                            await client.sendPhoto(chatId, image, { caption: `*Title:* *${title}*\n*Author:* *${author}*\n*Author URL:* *${author_url}*\n*Views:* *${stats.playCount}*\n*Likes:* *${stats.diggCount}*\n*Shares:* *${stats.shareCount}*\n*Comments:* *${stats.commentCount}*`, parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "With WaterMark", callback_data: `wm ${(await tools.shortlink(valid_tiktok_url[0])).result.url}` }], [{ text: "No WaterMark", callback_data: `nowm ${( await tools.shortlink(valid_tiktok_url[0])).result.url}` }]] } });
                        }
                    }
                } else {
                    if (!isGroup) await ctx.reply("send me a tiktok video link to download it!", { reply_to_message_id: messageId });
                }
                break;
                break
        }
    } catch (err) {
        console.log(err);
    };
});

serve.set("json spaces", 2);
serve.set("trust proxy", 1);

serve.all("/", async (req, res) => {
if (!connected) {
res.status(500).send({ status: 500, message: "Failed connect to Telegram API, please check your bot token!" })
} else {
let clientInfo = await client.getMe();
res.status(200).json({ status: 200, message: "Bot Success Connected to Telegram API", clientInfo });
}
})


bot.launch().then(() => {
    console.log("Bot started");
    console.log("Bot connected to: " + bot.botInfo.username);
    connected = true
}).catch(() => {
console.log("Failed connect to Telegram API, please check your bot token!")
}).finnaly(() => {
serve.listen(PORT, () => {
console.log("HTTP Server Running On PORT: "+PORT);
})
})
