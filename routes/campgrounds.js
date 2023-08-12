const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync.js');
const Campground = require('../models/campgroundModel');
const { isLoggedIn, validCampground, isAuthor } = require('../middleware.js');
const campgrounds = require('../controllers/campgrounds.js');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

router.route('/')
    .get(catchAsync(campgrounds.index))
    .post(isLoggedIn, upload.array('image'), validCampground, catchAsync(campgrounds.createCampground));

router.get('/new', isLoggedIn, campgrounds.renderNewForm);

router.get('/search', catchAsync(async (req, res) => {
    const { search } = req.query;
    if (search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        if (!req.query.page) {
            const campgrounds = await Campground.paginate({ title: regex });
            const campDocs = campgrounds.docs;
            const pageNext = campgrounds.nextPage;
            // const campgrounds = await Campground.find({ title: regex });
            if (campDocs.length)
                res.render('campgrounds/index.ejs', { campDocs, pageNext })
            // res.render('campgrounds/index.ejs', { campgrounds });
            else {
                req.flash('error', 'No such campground exists!!');
                res.redirect('/campgrounds');
            }
        } else {
            const { page } = req.query;
            const campgrounds = await Campground.paginate({ title: regex }, {
                page
            });
            res.status(200).json(campgrounds);
        }
    } else {
        res.redirect('/campgrounds');
    }
}))

router.route('/:id')
    .get(catchAsync(campgrounds.showCampground))
    .patch(isLoggedIn, isAuthor, upload.array('image'), validCampground, catchAsync(campgrounds.updateCampground))
    .delete(isLoggedIn, isAuthor, catchAsync(campgrounds.deleteCampground));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(campgrounds.renderEditForm));

module.exports = router;