# What is this?

![A Fieri Frame](https://66.media.tumblr.com/9b2fc56a82f38194079d9aead9a4ad31/tumblr_pn6vnuPwrO1y72ak6o1_1280.png)

A lil' util to help you create a stills generator.

## Setup

This project is sort of a weird command-line library.

Create your own project and make this a dependency, i.e. `npm init && npm install https://github.com/shahkashani/stills.git`

For inspiration and example setup, check out the [fieriframes bot](https://github.com/shahkashani/fieriframes/).

_In your own project_, you'll need three folders:

- `videos/` - where the source material will live. Can basically be any video format.
- `stills/` - where all the stills will end up
- `gifs/` - where all the gifs will end up

Below is a list of commands. You'll need `./node_modules/.bin` in your path, or just prepend that to every command.

## Generating stills? Here's all you need

I usually run these wherever I keep the videos, i.e. my personal computer.

### `stills`

Create stills from `videos` folder into `stills` folder. Run `stills --help` for more info.

#### Detecting and training faces

If you ran `stills --help`, you'll note there's a `--faces` options. This will, out of the box, work for faces! If all you care about is _any_ face, then just stop here.

However, if you're looking for _specific_ faces, you're gonna have to train it to detect them. Thankfully, that's super easy.

1. In your project, create a `faces` folder.
1. Make a subfolder and name it to match the person you're training, e.g. `faces/fieri`. Put a bunch of images in here of that person. It does _not_ have to be close-ups, but make sure your person is the only one in the image.
1. Run `train --name=fieri`. This will create a file called `faces/fieri.json`.
1. That's it. Next time you run `stills --faces=10`, it'll make sure 10% of images contain this `fieri` person.

#### Adding captions

1. Put a bunch of SRT files into a folder called `captions`
1. Run `stills --captions=10` or whatever percentage you want
1. For 10% of images, this will pick a random caption from one of your SRT files. Bonkers.

### `gifs`

Same as `stills`, but creates GIFs in a `gifs` folder. Run `gifs --help` for more info

### `upload`

Upload whatever is in `./gifs` and `./stills` to Dropbox.

## Posting stills? You'll wanna read this

### Setup

If you're _posting_ stills, you'll need the following things in either an `.env` file or as environment variables:

```
DROPBOX_ACCESS_TOKEN=Access token for the Dropbox account the stills live in
DROPBOX_FOLDER=Name of the folder the stills live in, e.g. /stills
TUMBLR_CONSUMER_KEY=Tungle app consumer key
TUMBLR_CONSUMER_SECRET=Tungle app consumer secret
TUMBLR_ACCESS_TOKEN_KEY=Tungle user access token, create this from the API console
TUMBLR_ACCESS_TOKEN_SECRET=Tungle user access token
TUMBLR_BLOG_NAME=Tungle blog name, don't include .tumblr.com
TWITTER_CONSUMER_KEY=Twitter app consumer key
TWITTER_CONSUMER_SECRET=Twitter app consumer secret
TWITTER_ACCESS_TOKEN_KEY=Twitter access token key for the account that'll be doing the tweeting
TWITTER_ACCESS_TOKEN_SECRET=Twitter access token secret for ditto
```

(You don't have to provide both Tumblr and Twitter keys, skip whichever ones you don't need.)

You're also gonna need to do the following in Dropbox as a one-time step:

1. A folder where the stills live, e.g. `/stills` (specify the name in the `DROPBOX_FOLDER` field in `.env`)
2. An empty JSON file called `<name>.json`, e.g. `/stills.json`, where all the posted images will be registered. It'll live at the same level as the folder. Start by just uploading a file with the contents `[]`.

OK, now onto the commands. I run these on a cron on Heroku.

### `connect`

Check the connection with Twitter and Dropbox. Good for validating the `.env` file.

### `post`

Connects to Dropbox and posts a still, and updates the JSON file with the image name and the live URL(s).
