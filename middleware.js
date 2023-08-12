const { campgroundSchema, reviewSchema } = require('./schemas.js');
const AppError = require('./utils/AppError.js');
const Campground = require('./models/campgroundModel');
const Review = require('./models/reviewModel');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be signed in first!!');
        return res.redirect('/login');
    }
    next();
}

module.exports.validCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new AppError(400, msg);
    } else {
        next();
    }
}

module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    if (!campground.author.equals(res.locals.currentUser._id)) {
        if (req.method === 'PATCH')
            req.flash('error', 'You do not have permission to EDIT!');
        else if (req.method === 'DELETE')
            req.flash('error', 'You do not have permission to DELETE!');
        else
            req.flash('error', 'You do not have permission!!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewID } = req.params;
    const review = await Review.findById(reviewID);
    if (!review.author.equals(res.locals.currentUser._id)) {
        if (req.method === 'PATCH')
            req.flash('error', 'You do not have permission to EDIT!');
        else if (req.method === 'DELETE')
            req.flash('error', 'You do not have permission to DELETE!');
        else
            req.flash('error', 'You do not have permission!!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

module.exports.validReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new AppError(400, msg);
    } else {
        next();
    }
}