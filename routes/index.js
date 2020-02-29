const express = require('express');
const router = express.Router();

/* GET home page */
router.get('/', (req, res, next) => {
    res.redirect('/login')
    //res.render('index', { user: req.user });
});


module.exports = router;
