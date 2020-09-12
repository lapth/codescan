var express = require("express");
var axios = require("axios");
var router = express.Router();

const clientID = APPCONFIG.clientID;
const clientSecret = APPCONFIG.clientSecret;

/* GET home page. */
router.get("/", function (req, res) {
  res.render("index", { clientID: clientID });
});

router.get("/home", (req, res) => {

    console.log('Retrieving access token!');

    const cbCode = req.query.code;
    if (!cbCode) return res.render('index');

    axios({
        method: "post",
        url: `https://github.com/login/oauth/access_token?client_id=${clientID}&client_secret=${clientSecret}&code=${cbCode}`,
        headers: {
            accept: "application/json",
        },
    }).then((response) => {

        console.log('Retrieving user information!');

        const accessToken = response.data.access_token;
        let sess = req.session;
        sess.accessToken = accessToken;

        axios({
            method: "get",
            url: "https://api.github.com/user",
            headers: {
                accept: "application/json",
                Authorization: "token " + accessToken,
            },
        }).then((userRes) => {
            // Store user information
            sess.userData = userRes.data;
            return gotoHome(req, res, {
                message: `Have a good day!`,
            });
        });
    });
});

router.post("/search", (req, res) => {

    console.log('Searching!');
    
    if (!validateRest(req, res)) {
        return;
    }

    const query = req.body.query;
    console.debug('Query: ', query);
    if (!query) {
        throw new Error('Query is empty!');
    }

    const access_token = req.session.accessToken;
    let result = {};

    axios({
        method: "get",
        url: `https://api.github.com/search/code`,
        headers: {
            accept: "application/json",
            Authorization: "token " + access_token,
        },
        params: {
            "q": query
        }
    }).then(rtData => {
        result = rtData.data;

        return gotoSearchResult(req, res, {result: JSON.stringify(result)});
    }).catch( err => {
        console.error(err);

        throw new Error('No result!');
    });
});

function gotoHome(req, res, opts) {
    const sess = req.session;
    
    res.render("home", {
        name: sess.userData.name,
        login: sess.userData.login,
        message: opts.message,
    });
}

function gotoSearchResult(req, res, opts) {
    const sess = req.session;
    
    res.render("result", {
        name: sess.userData.name,
        login: sess.userData.login,
        result: opts.result,
    });
}

function validateRest(req, res) {
    const access_token = req.session.accessToken;
    if (!access_token) {
        res.render("index");
        return false;
    }

    return true;
}

module.exports = router;
