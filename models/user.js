const mongoose = require("mongoose");

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
        gender: {
            type: String
        },
        name: {
            type: String
        },
        email: {
            type: String
        },
        dob: {
            date: {
                type: String
            },
            age: {
                type: Number
            }
        },
        lastname: {
            type: String
        },
        city: {
            type: String
        },
        country: {
            type: String
        },
        coordinates: {
            latitude: {
                type: String
            },
            longitude: {
                type: Number
            }
        },
        avatar: {
            type: String
        },
        currentlyPlaying: {
            type: Mixed
        },
        recentlyPlayed: {
            type: Mixed
        },
        currentMood: {
            type: Mixed
        },
        favoritePosts: {
            type: Mixed
        },
        favoriteGenres: {
            type: Array
        },
        matches: {
            type: Array
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);