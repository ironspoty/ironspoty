const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: "Name is required"
        },
        artists: {
            type: Array
        },
        popularity: {
            type: Number
        },
        spotifyUrl: {
            type: String
        },
        spotifyId: {
            type: String
        }
    }
);

module.exports = mongoose.model("Track", trackSchema);