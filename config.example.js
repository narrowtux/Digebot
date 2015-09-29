var config = {};

config.greeting = [
    "hello",
    "hi there",
    "hi",
    "guten tag",
    "good day",
    "good morning"
];

config.error = [
    "Oops",
    "Beep boop!",
    "I don't understand"
];


config.api_token = ""; // API Token for the bot
config.slash_command_token = ""; // Token for the slash command

config.digest_channel = "general"; // Channel to post digests to

config.schedule = ["0 9,15 * * *"];
config.port = 3000;

module.exports = config;