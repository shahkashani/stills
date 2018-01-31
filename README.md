# What is this?

A lil library to help you create a Twitter bot that tweets stills from...whatever.

## Setup

You'll need an `.env` file with the following in it:

```
DROPBOX_ACCESS_TOKEN=Access token for the Dropbox account the stills live in
DROPBOX_FOLDER=Name of the folder the stills live in, e.g. /stills
TWITTER_CONSUMER_KEY=Twitter app consumer key
TWITTER_CONSUMER_SECRET=Twitter app consumer secret
TWITTER_ACCESS_TOKEN_KEY=Twitter access token key for the account that'll be doing the tweeting
TWITTER_ACCESS_TOKEN_SECRET=Twitter access token secret for ditto
```

In Dropbox, you'll need:

1. A folder where the stills live, e.g. /stills
2. An empty JSON file called `<name>.json`, e.g. /stills.json, where all the tweeted images will be registered into by the `tweet` command. The folder and the JSON file need to live at the same level

## Commands

Below is a list of commands (you'll need `./node_modules/.bin` in your path)

### connect

Check the connection with Twitter and Dropbox. Good for validating the `.env` file.

### stills

Create stills from `videos` folder into `stills` folder. The first parameter is the number of stills you'd like, defaults to 3.

You'll then (manually, for now) take these stills and upload them to Dropbox.

### gifs (expertimental)

Same as `stills`, but creates GIFs in a `gifs` folder.

### tweet

Connects to Dropbox and tweets out a still from the image, and updates the JSON file with the image name and the live tweet URL.
