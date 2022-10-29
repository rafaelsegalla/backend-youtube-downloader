const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ytdl = require('ytdl-core');


const generateFileName = (infoVideo, format) => {
    var title = infoVideo["videoDetails"].title;
    return `${title.replace(/[^\w\s]/gi, '').replace(/\s/g,'').substring(0,20)}_${new Date().getTime()}.${format}`;
}

function stream2buffer(stream) {

    return new Promise((resolve, reject) => {
        const _buf = [];
        stream.on("data", (chunk) => _buf.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(_buf)));
        stream.on("error", (err) => reject(err));
    });
}

async function uploadToS3(buffer, fileName) {
    var params = {
        ACL: 'public-read',
        Bucket: 'download-youtube-repo',
        Key: fileName,
        Body: buffer
    };

    return await new Promise((resolve, reject) => {
        s3.putObject(params, (err, results) => {
            if (err) throw new Error(err);
            else resolve({
                url: `https://download-youtube-repo.s3.amazonaws.com/${fileName}`,
                results
            });
        });
    });
}

exports.handler = async (event) => {
    var url = event["queryStringParameters"] ? event["queryStringParameters"]["url"] : "https://www.youtube.com/watch?v=vXiZO1c5Sk0";
    var infoVideo = await ytdl.getBasicInfo(url);
    var fileName = generateFileName(infoVideo, "mp4");
    var stream = ytdl(url, {filter:"videoandaudio"});
    return await stream2buffer(stream)
        .then(b => uploadToS3(b, fileName))
        .then(result => {
            return {
                'statusCode': 200,
                'body': JSON.stringify(result)
            };
        });
};
