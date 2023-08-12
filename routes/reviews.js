const express = require('express');
const router = express.Router({ mergeParams: true });
const catchAsync = require('../utils/catchAsync.js');
const Review = require('../models/reviewModel');
const AppError = require('../utils/AppError.js');
const Campground = require('../models/campgroundModel');
const { validReview, isLoggedIn, isReviewAuthor } = require('../middleware.js');
const reviews = require('../controllers/reviews.js');

router.post('/', isLoggedIn, validReview, catchAsync(reviews.createReview));

router.delete('/:reviewID', isLoggedIn, isReviewAuthor, catchAsync(reviews.deleteReview));

module.exports = router;