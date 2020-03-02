const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: "Name is required"
        },
        artists: Array,
        popularity: Number,
        spotifyUrl: String,
        spotifyId: String
    }
);

module.exports = mongoose.model("Track", trackSchema);