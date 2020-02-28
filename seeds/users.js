const { withDbConnection, dropIfExists, hashPassword } = require("../lib");

const User = require("../models/User");
const axios = require("axios");

axios({
    method: 'get',
    url: 'https://randomuser.me/api/?results=25&nat=us,es,fr&exc=registered,id,phone,cell,nat',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    transformResponse: [(data) => {
        let transformedData = JSON.parse(data);
        return transformedData.results.map(item => {
            return {
                "username": item.login.username,
                "password": hashPassword('123456'),
                "gender": item.gender,
                "name": item.name.first,
                "email": item.email,
                "dob": item.dob,
                "lastname": item.name.last,
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
        await User.create(response.data);
        await User.create({
            "username": "admin",
            "password": hashPassword('admin'),
            "gender": 'male',
            "name": 'Carlos',
            "email": 'carlosmateo@carlosmateo.com',
            "dob": {
                date: '1992-01-30T10:55:46.574Z',
                age: 28
            },
            "lastname": 'Mateo',
            "city": 'Madrid',
            "country": 'Spain',
            "coordinates": {
                "latitude": '-23.1146',
                "longitude": '83.3794'
            },
            "avatar": 'https://randomuser.me/api/portraits/men/54.jpg'
        });
    });
});