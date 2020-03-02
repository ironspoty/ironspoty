const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: "Username is required",
            unique: true,
            index: true
        },
        password: {
            type: String,
            required: "Username is required",
        },
        name: String,
        lastname: String,
        fullname: String,
        initials: String,
        gender: String,
        email: String,
        city: String,
        country: String,
        avatar: String,
        dob: {
            date: { type: String },
            age: { type: Number }
        },
        coordinates: {
            latitude: { type: String },
            longitude: { type: String }
        },
        favoriteGenres: Array,
        friends: [{
            type: Schema.ObjectId,
            ref: 'User'
        }],
        matches: [{
            type: Schema.ObjectId,
            ref: 'User'
        }],
        currentlyPlaying: { type: Schema.Types.Mixed },
        recentlyPlayed: { type: Schema.Types.Mixed },
        currentMood: { type: Schema.Types.Mixed },
        favoritePosts: { type: Schema.Types.Mixed },
        userSpotifyData: { type: Schema.Types.Mixed }
    },
    {
        timestamps: true
    },
);

module.exports = mongoose.model("User", userSchema);