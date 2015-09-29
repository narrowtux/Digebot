var Slack = require("slack-client");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database("./digebot.sqlite3");
var fs = require("fs");
var Log = require("log");
var config = require("./config.js");
var DM = require("./node_modules/slack-client/src/dm.js");
var bodyParser = require('body-parser');
var multer = require('multer');
var schedule = require('node-schedule');
logger = new Log("info");
var express = require("express");
var webapp = express();

autoReconnect = true;
autoMark = true;

var DIGEST_PATTERN = /<?(https:\/\/([a-zA-Z\-0-9]+)\.slack\.com\/archives\/([a-zA-Z0-9]+)\/([a-z0-9A-Z\-]+))>? (.*)/
var URL_PATTERN = /<(https?:\/\/[^\s]*)>/;

var slack = new Slack(config.api_token, autoReconnect, autoMark);
var digestChannel = null;

fs.readFile("schema.sql", "utf-8", function(err, data) {
    if (err) {
        console.log(err);
        return;
    }
    db.run(data);
});

db.serialize(function() {
    //db.each("SELECT * FROM digests", function (err, row) {
    //    console.log(row);
    //});
});

slack.on("error", function(err) {
    logger.critical(err);
});

slack.on("open", function () {
    logger.info("Connected");
    digestChannel = slack.getChannelByName(config.digest_channel);
});

function addDigestFromMessage(message, reportedChannel, summary, user) {
    if (message.ok) {
        if (message.messages.length == 1) {
            var reportedMessage = message.messages[0];
            addDigest(reportedChannel, summary, user, reportedMessage);
        }
    }
}
function addDigestWithMatch(match, user) {
    console.log(match);

    var reportedChannel = slack.getChannelByName(match[3]);
    if (!reportedChannel || reportedChannel instanceof DM) {
        return {ok: false, message: "You can't digest private messages."};
    }

    console.log("Channel ID " + reportedChannel.id);

    var ts = match[4].substr(1);
    ts = ts.replace(/([0-9]{6})$/, ".$1");
    var options = {
        oldest: ts,
        latest: ts,
        inclusive: 1,
        count: 1,
        channel: reportedChannel.id
    };
    var summary = match[5];
    var message_url = match[1];
    slack._apiCall("channels.history", options, function (data) {
        console.log(data);
        addDigestFromMessage(data, reportedChannel, summary, user, message_url);
    });
    return {ok: true, message: "Thanks"};
}

slack.on("message", function(message) {
    var user = slack.getUserByID(message.user);
    var dm = slack.getDMByID(message.channel);
    if (dm && user) {
        logger.info("@" + user.name + " [DM]: " + message.text);

        var text = message.text;
        if (config.greeting.indexOf(text.toLowerCase()) >= 0) {
            dm.send(applySentenceCase(
                config.greeting[nextRandomInt(config.greeting.length)]));
        } else if (text == ":eggplant:") {
            dm.send("( ͡° ͜ʖ ͡°)");
        } else {
            var match = DIGEST_PATTERN.exec(text);
            if (match) {
                dm.send(addDigestWithMatch(match, user).message);
            } else if (text == "send") {
                dm.send("Ok, I'll send this.");
                sendDigests();
            }
        }
    }
});

function applySentenceCase(str) {
    var sentences = str.split(/[\.!\?/]/);
    var text = "";
    sentences.forEach(function(sentence) {
        text += sentence.charAt(0).toUpperCase() + sentence.substr(1).toLowerCase() + ".";
    });
    return text;
}

function addDigest(channel, summary, reportingUser, message) {
    var url = generateArchivesLink(slack.team.domain, channel.name, message.ts);
    db.run("INSERT INTO digests (summary, user, message_url, channel, created, message) VALUES (?, ?, ?, ?, ?, ?)",
        summary, reportingUser.id, url, channel.id, new Date().getTime(), message.text);
    console.info("Added digest for " + url + " '" + message + "' from " + reportingUser.name + " with summary '" + summary + "'");
}

function nextRandomInt(max) {
    return Math.floor(Math.random() * (max - 1));
}

var messageQueue = [];
var sendingMessage = null;

function invokeMessageQueue(data) {
    if (data && !data.ok) {
        logger.critical("Error for message");
        logger.critical(sendingMessage);
        logger.critical(data);
    }
    if (messageQueue.length == 0) {
        return;
    }
    sendingMessage = messageQueue.shift();
    slack._apiCall("chat.postMessage", sendingMessage, invokeMessageQueue);
}

function sendDigests() {
    db.serialize(function () {
        db.each("SELECT COUNT(*) FROM digests WHERE status = 0", function(err, row) {
            var count = row["COUNT(*)"];
            if (count > 0) {
                digestChannel.send("*Here's what you might have missed in the last 6h*");

                var lastChannel = null;

                var i = 0;
                db.each("SELECT * FROM digests WHERE status = 0 ORDER BY channel ASC, created ASC", function (err, row) {
                    if (err) {
                        logger.critical("Error while accessing db for digests");
                        logger.critical(err);
                        return;
                    }
                    var currentChannel = slack.getChannelByID(row["channel"]);
                    if (!lastChannel || lastChannel.id != currentChannel.id) {
                        var channelMsg = {
                            channel: digestChannel.id,
                            text: "#"+currentChannel.name,
                            as_user: true
                        };
                        messageQueue.push(channelMsg);
                    }
                    var suggestingUser = slack.getUserByID(row["user"]);

                    var urlMatch = URL_PATTERN.exec(row["message"]);
                    var msg = {
                        channel: digestChannel.id,
                        text: urlMatch ? urlMatch[1] : "",
                        unfurl_links: true,
                        as_user: true,
                        attachments: JSON.stringify([{
                            title: row["summary"],
                            text: "_suggested by " + suggestingUser.name + "_",
                            color: "#733AA9",
                            title_link: row["message_url"],
                            mrkdwn_in: ["text"]
                        }])
                    };
                    messageQueue.push(msg);

                    lastChannel = currentChannel;
                    i++;
                    if (i == count) {
                        invokeMessageQueue();
                        db.run("UPDATE digests SET status = 1 WHERE status = 0");
                    }
                });
            }
        });

    });
}

function generateArchivesLink(team, channel, ts) {
    return "https://" + team + ".slack.com/archives/" + channel + "/p" + ts.replace(/\./, "");
}

webapp.use(bodyParser.json()); // for parsing application/json
webapp.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

webapp.post("/slackslash", function(req, res) {
    logger.info("Incoming slackslash");
    if (req.body.token == config.slash_command_token) {
        if (req.body.command == "/digest") {
            console.log(req.body);
            var channel = slack.getChannelByID(req.body.channel_id);
            var user = slack.getUserByID(req.body.user_id);
            var text = req.body.text;
            var match = DIGEST_PATTERN.exec(text);

            if (text == "") {
                res.status(400).send("You have to summarize what happened.");
                return;
            }

            if (match) {
                var result = addDigestWithMatch(match, user);
                if (!result.ok) {
                    res.status(400);
                }
                res.send(result.message);
            } else if (channel) {
                slack._apiCall("channels.history", {channel: channel.id, count: 1}, function(message) {
                    addDigestFromMessage(message, channel, text, user);
                    res.send("Thanks!");
                });
            } else {
                res.status(400).send("You can't digest private messages");
                logger.info("Tried to digest private message");
            }
        } else {
            res.status(404, "Command not found");
            logger.info("Command wrong")
        }
    } else {
        res.status(401, "Wrong token");
        logger.info("Wrong token");
    }
});

var server = webapp.listen(3000);

slack.login();

config.schedule.forEach(function(s) {
    schedule.scheduleJob(s, sendDigests);
});