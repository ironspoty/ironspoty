const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new mongoose.Schema(
    {
        author: {
            type: Schema.ObjectId,
            ref: 'User'
        },
        body: String,
        posttype: String,
        date: {
            type: Date,
            default: Date.now
        },
        hidden: {
            type: Boolean,
            default: false
        },
        meta: {
            likes: Number,
            ref: {
                type: Schema.ObjectId,
                ref: 'User'
            }
        }
    },
    {
        timestamps: true
    },
);

module.exports = mongoose.model("Post", postSchema);