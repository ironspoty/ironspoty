const { withDbConnection, dropIfExists } = require("../../lib");
const User = require("../../models/User");
const Post = require("../../models/Post");
const axios = require("axios");

axios({
    method: 'get',
    url: 'https://baconipsum.com/api/?type=all-meat&paras=1&start-with-lorem=1',
    params: {
        'type': 'meat-and-filler',
        'start-with-lorem': '1',
        'paras': '52'
    },
    responseType: 'json',
}).then(response => {
    withDbConnection(async () => {

        const users = await User.find({});
        const posts = users.map(user => {
            return {
                author: user._id,
                body: response.data.pop(),
                posttype: 'post',
                hidden: false,
            }
        })

        await dropIfExists(Post);
        await Post.create(posts);
    });
}).catch(error => {
    console.log('ERROR: ' + error);
})