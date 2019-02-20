# What is this?

![A Fieri Frame](https://66.media.tumblr.com/9b2fc56a82f38194079d9aead9a4ad31/tumblr_pn6vnuPwrO1y72ak6o1_1280.png)

A lil' library to help you create a stills generator.

## Setup

This project is a library.

Create your own project and make this a dependency, i.e.:

```{
  "name": "fieriframes",
  "version": "1.0.0",
  "description": "Guy Fieri Frames",
  "engines": {
    "node": "10.x"
  },
  "dependencies": {
    "stills": "git+https://github.com/shahkashani/stills.git"
  }
}
```

_In your own project_, you'll need an `.env` file with the following in it:

```
# You'll need these two if you're posting (or uploading stills)
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

You'll also need three folders in your project:

- `videos/` - where the source material will live. Can basically be any video format.
- `stills/` - where all the stills will end up
- `gifs/` - where all the gifs will end up

## Posting or uploading?

If you doing anything else than generating stills (i.e. posting or uploading), you're gonna need to do the following in Dropbox:

1. A folder where the stills live, e.g. `/stills` (specify the name in the `DROPBOX_FOLDER` field in `.env`)
2. An empty JSON file called `<name>.json`, e.g. `/stills.json`, where all the posted images will be registered. It'll live at the same level as the folder. Start by just uploading a file with the contents `[]`.

## Commands

Below is a list of commands. You'll need `./node_modules/.bin` in your path, or just prepend that to every command.

### Generating stills? Here's what you need.

I usually run these wherever I keep the videos, i.e. my personal computer.

#### `stills`

Create stills from `videos` folder into `stills` folder. Run `stills --help` for more info.

`stills` has a lot of weird parameters. If you need docs for how to train faces, etc., holla at me and I'll fill out this doc.

#### `gifs`

Same as `stills`, but creates GIFs in a `gifs` folder. Run `gifs --help` for more info

#### `upload`

Upload whatever is in `./gifs` and `./stills` to Dropbox.

### Posting stills

I run these commands on a cron on Heroku.

#### `connect`

Check the connection with Twitter and Dropbox. Good for validating the `.env` file.

#### `post`

Connects to Dropbox and posts a still, and updates the JSON file with the image name and the live URL.
