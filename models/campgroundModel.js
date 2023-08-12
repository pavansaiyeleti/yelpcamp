const mongoose = require('mongoose');
const Review = require('./reviewModel');
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate-v2');

const imageSchema = new Schema({
    url: String,
    filename: String
})

imageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_100');
})

const opts = { toJSON: { virtuals: true } };

const campGroundSchema = new Schema({
    title: String,
    images: [imageSchema],
    price: Number,
    description: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    location: String,
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'

        }
    ]
}, opts)

campGroundSchema.virtual('properties.popupMarkup').get(function () {
    return `<strong><a href="/campgrounds/${this._id}">${this.title}</a></strong>
            <p>${this.description.substring(0, 20)}...</p>`;
})

campGroundSchema.post('findOneAndDelete', async (doc) => {
    if (doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.reviews,
            }
        })
    }
})

campGroundSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Campground', campGroundSchema);

