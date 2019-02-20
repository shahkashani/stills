# What is this?

A lil' library to help you create a stills bot that creates stills from basically whatever.

## Setup

You'll need an `.env` file with the following in it:

```
DROPBOX_ACCESS_TOKEN=Access token for the Dropbox account the stills live in
DROPBOX_FOLDER=Name of the folder the stills live in, e.g. /stills
# Optional
TUMBLR_CONSUMER_KEY=Tungle app consumer key
TUMBLR_CONSUMER_SECRET=Tungle app consumer secret
TUMBLR_ACCESS_TOKEN_KEY=Tungle user access token, create this from the API console
TUMBLR_ACCESS_TOKEN_SECRET=Tungle user access token
TUMBLR_BLOG_NAME=Tungle blog name, don't include .tumblr.com
# Optional
TWITTER_CONSUMER_KEY=Twitter app consumer key
TWITTER_CONSUMER_SECRET=Twitter app consumer secret
TWITTER_ACCESS_TOKEN_KEY=Twitter access token key for the account that'll be doing the tweeting
TWITTER_ACCESS_TOKEN_SECRET=Twitter access token secret for ditto
```

In Dropbox, you'll need:

1. A folder where the stills live, e.g. /stills
2. An empty JSON file called `<name>.json`, e.g. /stills.json, where all the tweeted images will be registered into by the `tweet` command. The folder and the JSON file need to live at the same level

## Commands

Below is a list of commands (you'll need `./node_modules/.bin` in your path).

### Generating stills? Here's what you need.

I usually run these wherever I keep the videos, i.e. my personal computer.

#### `stills`

Create stills from `videos` folder into `stills` folder. Run `stills --help` or `./node_modules/.bin/stills --help` for more info.

#### `gifs`

Same as `stills`, but creates GIFs in a `gifs` folder. Run `gifs --help` for more info

I usually run this wherever I keep the videos, i.e. my personal computer.

#### `upload`

Upload whatever is in gifs/ and stills/ to Dropbox.

I usually run this wherever I keep the videos, i.e. my personal computer.

### Posting stills

I run these commands on a cron on Heroku.

#### `connect`

Check the connection with Twitter and Dropbox. Good for validating the `.env` file.

#### `post`

Connects to Dropbox and posts a still, and updates the JSON file with the image name and the live URL.
