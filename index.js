const { Client, GatewayIntentBits } = require('discord.js');
const { TwitterApi } = require('twitter-api-v2');
const { ETwitterStreamEvent } = require('twitter-api-v2');
require("dotenv").config();


const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const appOnlyClient = new TwitterApi(process.env.TWITTER_BEARER);

const endPointParamters = {
  'tweet.fields': ['referenced_tweets'],
}
const rules = [{
  "value": "from:" + process.env.TWITTER_USER_NAME, "tag": `${process.env.TWITTER_USER_NAME}`
}]

const body = {
  "add": rules
}

async function sendMessage(tweet, client) {
  const url = "https://twitter.com/user/status/" + tweet;
  try {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID)
    channel.send("@everyone New announcement from twitter! " + url)
  } catch (error) {
    console.error(error);
  }
}


async function setupRulesTwitter() {

  try {

    await appOnlyClient.v2.updateStreamRules(body)

  } catch (err) {
    console.log(err)
  }
}


async function setupStreamTwitter() {
  const stream = await appOnlyClient.v2.searchStream(endPointParamters);
  stream.autoReconnect = true;
  try {

    stream.on(
      // Emitted when a Twitter payload (a tweet or not, given the endpoint).
      ETwitterStreamEvent.Data, async tweet => {
        if (tweet.data.referenced_tweets === undefined) {
          sendMessage(tweet.data.id, client);
        }

        stream.on(ETwitterStreamEvent.ConnectionLost, () => stream.reconnect())

      }
    );

  } catch (error) {
    if (error) {
      stream.reconnect();
    }
    else {
      setupStreamTwitter();
    }

  }

}
// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  setupRulesTwitter();
  setupStreamTwitter();
});