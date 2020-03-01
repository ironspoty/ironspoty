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
    url: 'https://randomuser.me/api/?results=25&nat=us,es,fr&exc=registered,id,phone,cell,nat',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    transformResponse: [(data) => {
        let transformedData = JSON.parse(data);

        return transformedData.results.map(item => {
            return {
                "username": item.login.username,
                "name": item.name.first,
                "lastname": item.name.last,
                "fullname": `${item.name.first} ${item.name.last}`,
                "nameinitials": `${item.name.first[0]} ${item.name.last[0]}`,
                "password": hashPassword('123456'),
                "gender": item.gender,
                "email": item.email,
                "dob": item.dob,
                "city": item.location.city,
                "country": item.location.country,
                "coordinates": item.location.coordinates,
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

        await User.create({
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
            "avatar": 'https://randomuser.me/api/portraits/men/54.jpg',
            "favoriteGenres": getRandom(genres, 5),
            "currentlyPlaying": getRandom(tracks, 1)[0],
            "recentlyPlayed": getRandom(tracks, 10),
            "friends": getRandom(users, 5, true),
        });
    });
});