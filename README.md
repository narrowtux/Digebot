# Slack Digest Bot
![Digest preview](http://i.imgur.com/j4L9CXs.png)

This bot will collect summaries about what happened in channels.

This is a great way to engage all your users. People won't feel bad because they can't miss out on stuff that happened while they were away, on vacation, or asleep.

## Usage
Users have 2 ways of sending a summary to the bot:

 * Use the `/digest` slash command
 
   Usage:
   
   `/digest [summary]` will use the last message in the channel and link that with the summary
   
   `/digest [archive perma link] [summary]` will use the given permalink and links that with the summary

 * PM to the bot
   
   Usage:
   
   `[archive perma link] [summary]` will use the given permalink and links that with the summary
   
The bot will then collect those summaries and send them to the configured channel at the scheduled times.

## Setup
### Prerequisites
 * Install `node.js` and `npm`.
 * In your Slack, add a new Bot. We recomment calling it `@digebot`
     * Keep the **API Token** for later
     * `recommended` You can use `digebot_2x.png` as the bots logo
 * `recommended` Make a `#news` channel where this bot posts its messages
 * `optional` Under Integrations, create a new slash-command
     * **Command** `/digest`
     * **URL** `http://your-domain:3000/slackslash`
     * Keep the **Token** for later
     * **Autocomplete help text**
         * **Description** `Adds a summary to the next digest`
         * **Usage hint** `[archives url] summary`
         
### Installing
 * Download the sources and navigate into the `Digebot` directory.
 * Install dependencies with `npm install`
 * Copy the example config file to `config.js` `cp config.example.js config.js`
     * Edit the config file with your favorite editor. Here, you can enter the tokens from before

After that you're good to go.

Run 

```node main.js```

## License
This project is licensed under the GNU Lesser General Public License, Version 3.0

## Contributors

 * @ridddle Inspiration, Design, QA, Testing
 * @narrowtux Programming
