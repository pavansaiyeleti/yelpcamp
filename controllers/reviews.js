const Review = require('../models/reviewModel.js');
const Campground = require('../models/campgroundModel.js');
const Notification = require('../models/notificationModel.js');
const User = require('../models/userModel.js');

module.exports.createReview = async (req, res) => {
    const campground = await Campground.findById(req.params.id).populate('author');
    const review = new Review(req.body);
    review.author = req.user._id;
    campground.reviews.push(review);
    await review.save();
    const newNotification = {
        username: req.user.username,
        notifType: 'review',
        notifId: campground._id
    }
    const notification = await Notification.create(newNotification);
    campground.author.notifications.push(notification);
    await campground.save();
    await campground.author.save();
    req.flash('success', 'Created a new review!!');
    res.redirect(`/campgrounds/${campground._id}`);
}

module.exports.deleteReview = async (req, res) => {
    await Campground.findByIdAndUpdate(req.params.id, { $pull: { reviews: req.params.reviewID } });
    await Review.findByIdAndDelete(req.params.reviewID);
    req.flash('success', 'Successfully deleted a review!!');
    res.redirect(`/campgrounds/${req.params.id}`);
}