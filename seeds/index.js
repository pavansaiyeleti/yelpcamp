if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: '../.env' });
}

const mongoose = require('mongoose');
const cities = require('./cities');
const { descriptors, places } = require('./seedHelpers');
const Campground = require('../models/campgroundModel');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mbxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mbxToken });


mongoose.connect('mongodb://127.0.0.1:27017/yelpCamp')
    .then(console.log('Connection open!!'))
    .catch(err => console.log(err));

const sample = array => array[Math.floor(Math.random() * array.length)];

const imgSources = ['https://source.unsplash.com/random/?camping', 'https://source.unsplash.com/random/?camps']

const fakeAuthors = ['62a5d43b8141634bcbc7e491', '62a5d7a20d69f8beba2dafe7']

const seedDB = async () => {
    await Campground.deleteMany({});
    for (let i = 0; i < 50; i++) {
        const city = sample(cities);
        const price = Math.floor(Math.random() * 20) + 10;
        const location = `${city.city}, ${city.state}`;
        const geoData = await geocoder.forwardGeocode({
            query: location,
            limit: 1
        }).send();
        const camp = new Campground({
            author: `${sample(fakeAuthors)}`,
            location,
            geometry: geoData.body.features[0].geometry,
            title: `${sample(descriptors)} ${sample(places)}`,
            images: [
                {
                    url: "https://res.cloudinary.com/yelpcamplikith02/image/upload/v1655010923/yelpCamp/y1xhx5i5kobcdvg9lhfe.jpg",
                    filename: "yelpCamp/y1xhx5i5kobcdvg9lhfe",
                },
                {
                    url: "https://res.cloudinary.com/yelpcamplikith02/image/upload/v1655010922/yelpCamp/jgfd9wn6vveycacw3g9c.jpg",
                    filename: "yelpCamp/jgfd9wn6vveycacw3g9c",
                }
            ],
            description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quibusdam dolores vero perferendis laudantium, consequuntur voluptatibus nulla architecto, sit soluta esse iure sed labore ipsam a cum nihil atque molestiae deserunt!',
            price
        })
        await camp.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})