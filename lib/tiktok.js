const axios = require('axios');

const clean = (str) => {
    let regex = /(<([^>]+)>)/gi;
    data = str.replace(/(<br?\s?\/>)/gi, " \n");
    return data.replace(regex, "");
}

module.exports.nowm = async (query) => {
    return new Promise(async (resolve, reject) => {
        try {
        let response = await axios("https://lovetik.com/api/ajax/search", {
            method: "POST",
            data: new URLSearchParams(Object.entries({ query })),
          });
        
          result = {};
        
          if (response.data.status == "ok") {
          result.title = clean(response.data.desc);
          result.author = clean(response.data.author);
          result.nowm = 
            (response.data.links[0].a || "").replace("https", "http");
          result.watermark = 
            (response.data.links[1].a || "").replace("https", "http");
          result.audio = 
            (response.data.links[2].a || "").replace("https", "http");
          result.thumbnail = response.data.cover;
          resolve(result);
        } else {
        reject("Something went wrong!");
        }
        } catch (error) {
        reject(error);
        }
    });
    }

    module.exports.getVideoMeta = async (url) => {
    return new Promise(async (resolve, reject) => {
    try {
    let response = await axios.get("https://tikapi.caliphapi.me/video.php?url=" + encodeURIComponent(url));
    return resolve(response.data);
    } catch (error) {
    return reject(error);
    }
    });
    }
