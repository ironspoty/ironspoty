const { withDbConnection, dropIfExists, hashPassword } = require("../../lib");
const axios = require("axios");
const User = require("../../models/User");
const MusicGenre = require("../../models/MusicGenre");
const Track = require("../../models/Track");

const getRandom = (array, n, returnArrayOfIds) => {
    let newArr = [];

    for (let i = 0; i < n; i++) {
        newArr.push(array[Math.floor(Math.random() * array.length)])
    }

    return returnArrayOfIds ? newArr.map((user) => user._id) : newArr;
}

axios({
    method: 'get',
    url: 'https://randomuser.me/api/?results=26&nat=us,es,fr&exc=registered,id,phone,cell,nat,coordinates',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    transformResponse: [(data) => {
        let transformedData = JSON.parse(data);
        const coordinates = [
            { "longitude": -3.6806426, "latitude": 40.4641763 },
            { "longitude": -3.6775118, "latitude": 40.4181685 },
            { "longitude": -3.7287666, "latitude": 40.4702098 },
            { "longitude": -3.692049, "latitude": 40.4658571 },
            { "longitude": -3.6824795, "latitude": 40.4219631 },
            { "longitude": -3.6974001, "latitude": 40.4524187 },
            { "longitude": -3.6392159, "latitude": 40.4631333 },
            { "longitude": -3.7057999, "latitude": 40.4518661 },
            { "longitude": -3.7083202, "latitude": 40.423093 },
            { "longitude": -3.6867364, "latitude": 40.4601224 },
            { "longitude": -3.6949302, "latitude": 40.4010216 },
            { "longitude": -3.6924296, "latitude": 40.4251223 },
            { "longitude": -3.7159634, "latitude": 40.4390676 },
            { "longitude": -3.726689, "latitude": 40.427977 },
            { "longitude": -3.7304776, "latitude": 40.4613439 },
            { "longitude": -3.7150402, "latitude": 40.4103102 },
            { "longitude": -3.6851124, "latitude": 40.4456899 },
            { "longitude": -3.6754097, "latitude": 40.4569816 },
            { "longitude": -3.6700987, "latitude": 40.44825 },
            { "longitude": -3.7009534, "latitude": 40.4348648 },
            { "longitude": -3.6848242, "latitude": 40.4327656 },
            { "longitude": -3.6713801, "latitude": 40.4278899 },
            { "longitude": -3.6337514, "latitude": 40.4423879 },
            { "longitude": -3.6963938, "latitude": 40.4360524 },
            { "longitude": -3.7939977, "latitude": 40.4591683 },
            { "longitude": -3.7062432, "latitude": 40.4947343 }
        ];

        return transformedData.results.map(item => {
            return {
                "username": item.login.username,
                "name": item.name.first,
                "lastname": item.name.last,
                "fullname": `${item.name.first} ${item.name.last}`,
                "initials": `${item.name.first[0]} ${item.name.last[0]}`,
                "password": hashPassword('123456'),
                "gender": item.gender,
                "email": item.email,
                "dob": item.dob,
                "city": item.location.city,
                "country": item.location.country,
                "coordinates": coordinates.pop(),
                "avatar": item.picture.large
            }
        })
    }],
    responseType: 'json'
}).then(response => {
    withDbConnection(async () => {
        await dropIfExists(User);

        let genres = await MusicGenre.find({});
        let tracks = await Track.find({});

        response.data.forEach(item => {
            item.favoriteGenres = getRandom(genres, 5);
            item.currentlyPlaying = getRandom(tracks, 1)[0];
            item.recentlyPlayed = getRandom(tracks, 10);
        });

        await User.create(response.data);

        let users = await User.find({});

        await User.insertMany([
            {
                "username": "admin",
                "password": hashPassword('admin'),
                "gender": 'male',
                "name": 'Carlos',
                "lastname": 'Mateo',
                "fullname": 'Carlos Mateo',
                "nameinitials": 'CM',
                "email": 'carlosmateo@carlosmateo.com',
                "dob": {
                    date: '1992-01-30T10:55:46.574Z',
                    age: 28
                },
                "city": 'Madrid',
                "country": 'Spain',
                "coordinates": {
                    "latitude": '-23.1146',
                    "longitude": '83.3794'
                },
                "avatar": '',
                "favoriteGenres": getRandom(genres, 5),
                "currentlyPlaying": getRandom(tracks, 1)[0],
                "recentlyPlayed": getRandom(tracks, 10),
                "friends": getRandom(users, 5, true),
            },
            {
                "username": "admin2",
                "password": hashPassword('admin2'),
                "gender": 'male',
                "name": 'Ignacio',
                "lastname": 'García-Barrero',
                "fullname": 'Ignacio García-Barrero',
                "nameinitials": 'IG',
                "email": 'ignaciogb@ignaciogb.com',
                "dob": {
                    date: '1991-04-23T10:55:46.574Z',
                    age: 28
                },
                "city": 'Madrid',
                "country": 'Spain',
                "coordinates": {
                    "latitude": '-23.1146',
                    "longitude": '83.3794'
                },
                "avatar": '',
                "favoriteGenres": getRandom(genres, 5),
                "currentlyPlaying": getRandom(tracks, 1)[0],
                "recentlyPlayed": getRandom(tracks, 10),
                "friends": getRandom(users, 5, true),
            }
        ]);
    });
});