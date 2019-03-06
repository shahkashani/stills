# What is this?

![A Fieri Frame](https://66.media.tumblr.com/9b2fc56a82f38194079d9aead9a4ad31/tumblr_pn6vnuPwrO1y72ak6o1_1280.png)

A small library to help you create a stills generator like [Fieri Frames](http://fieriframes.tumblr.com). In fact, the [source](https://github.com/shahkashani/fieriframes/) for that bot might be a good example to look at.

# Dependencies

You're going to need:

1. brew: [https://brew.sh/](https://brew.sh/)
1. imagemagick: `brew install imagemagick`
1. ffmpeg: `brew install ffmpeg`

# Setup

`npm install stills --save`

# Usage

```javascript
const {
  sources,
  content,
  filters,
  destinations,
  validators,
  generate
} = require('stills');
const { resolve } = require('path');

const config = {
  source: new sources.S3({
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    bucket: S3_BUCKET
  }),
  content: new content.Still(),
  filters: [
    new filters.Captions({
      folder: resolve('./captions')
    })
  ],
  validators: [new validators.FaceDetection()],
  destinations: [
    new destinations.Tumblr({
      consumerKey: TUMBLR_CONSUMER_KEY,
      consumerSecret: TUMBLR_CONSUMER_SECRET,
      token: TUMBLR_ACCESS_TOKEN_KEY,
      tokenSecret: TUMBLR_ACCESS_TOKEN_SECRET,
      blogName: TUMBLR_BLOG_NAME,
      tags: ['Hello']
    }),
    new destinations.Twitter({
      consumerKey: TWITTER_CONSUMER_KEY,
      consumerSecret: TWITTER_CONSUMER_SECRET,
      accessTokenKey: TWITTER_ACCESS_TOKEN_KEY,
      accessTokenSecret: TWITTER_ACCESS_TOKEN_SECRET
    })
  ]
};

generate(config);
```

This will generate a random still from your S3 bucket, make sure at least one face appears in the image, add a caption from a random SRT file in the `captions` folder and then upload the result to Tumblr and Twitter.

There are other options for `source`, `content` and `validators`. Keep readin'.

## Sources

### Local folder

If you don't want to spend rack up your S3 bill while testing, you can point the generator at a local folder containing videos.

```javascript
new stills.sources.Local({
  folder: resolve('./videos')
});
```

### S3

As you saw in the example above, you can point the generator at an S3 bucket. It won't download the full video, as `ffmpeg` is capable of working with remote files.

```javascript
new stills.sources.S3({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  bucket: S3_BUCKET
});
```

## Content

### Stills

This one doesn't have any options. It's just:

```javascript
new stills.content.Still();
```

### GIFs

Most sites have some upper limit on GIF sizes, so you can adjust either the generated image `width` (default: `540`), the `duration` (default: `2`) or the frame-rate with `fps` (default: `12`) to fit your needs.

```javascript
new stills.content.Gif({
  width: 540,
  duration: 2,
  fps: 12
});
```

## Filters

### Captions

This filter supports reading random `.srt` files (movie subtitles) and `.txt` files (newline-separated lines) from a folder and applying them to either a still and the GIF.

```javascript
new stills.filters.Captions({
  folder: resolve('./captions'),
  num: 2,
  isSequential: false,
  font: resolve('./fonts/maison.ttf')
  background: null,
});
```

The parameters:

- `folder` (mandatory) is the location from which the subtitles files will be loaded.
- `num` (default: `2`) is only applicable to GIFs; it determines how many captions to apply, distributed evenly based on the GIF duration.
- `isSequential` (default: `false`) is relevant when `num > 1`, determines whether the randomly picked captions are be sequential.
- `font` (default: `null`) is a path to a font file, will use Arial if nothing is provided.
- `background` (default: `null`) is an optional hex rgba color that will be added under the text, will use a text drop-shadow if nothing is provided.

### Glitch

Destroys your content by mangling random bytes (default: `300`).

```javascript
new stills.filters.Glitch({
  bytes: 300
});
```

### Distortion

Stretches your image; for a still, it will immediately apply the stretch, for a GIF, it will increasingly apply the transformation during the course of the animation.

`widthFactor` and `heightFactor` should be 0-1; the higher the number, the more it streches the image in that direction.

```javascript
new stills.filters.Distortion({
  heightFactor: 0.6
  widthFactor: 0
});
```

### Face zoom

Only works with GIFs! Detect a face from the last frame and zooms towards it throughout the GIF. If it can't find a face or if you give it a still image, it does nothing.

```javascript
new stills.filters.FaceZoom({
  startPosition: 0.5
});
```

By default it starts zooming towards the face half-way through the GIF, but you can adjust that using `startPosition` (0-1).

## Destinations

### Tumblr

What it says on the box.

```javascript
new stills.destinations.Tumblr({
  consumerKey: TUMBLR_CONSUMER_KEY,
  consumerSecret: TUMBLR_CONSUMER_SECRET,
  token: TUMBLR_ACCESS_TOKEN_KEY,
  tokenSecret: TUMBLR_ACCESS_TOKEN_SECRET,
  blogName: TUMBLR_BLOG_NAME,
  tags: ['Hello']
});
```

The name of the video file is automatically added as a tag to the post, but you can also provide additional ones with the `tags` parameter (default: `[]`).

### Twitter

What it says on this box, also.

```javascript
new stills.destinations.Twitter({
  consumerKey: TWITTER_CONSUMER_KEY,
  consumerSecret: TWITTER_CONSUMER_SECRET,
  accessTokenKey: TWITTER_ACCESS_TOKEN_KEY,
  accessTokenSecret: TWITTER_ACCESS_TOKEN_SECRET
});
```

## Validators

When a validator fails, it deletes the generated image and creates another one to try again. It does this a maximum of 10 times, and then gives up and posts whatever.

### Face detection

Using Tensorflow, makes sure there's at least one face in the image.

```javascript
new stills.validators.FaceDetection();
```

### Face recognition

The `folder` should point to wherever you're keeping the face descriptors.

```javascript
new stills.validators.FaceRecognition({
  folder: resolve('./faces')
});
```

What's a face descriptor, you ask? It's a JSON file that describes the face you're trying to match. Below is how you generate it.

1. Find a bunch of images (~10) with the person in them and put them in a folder (e.g. `face-training`). Make sure there are no other people in these images. It does _not_ have to be close-ups -- ideally it's stills from the actual videos you're using.
1. Create a folder for the descriptor file to be saved in (e.g. `faces`).
1. `./node_modules/.bin/train-faces -i face-training -o faces --name "Name of the person"`
1. This will eventually generate `faces/name-of-the-person.json`. Success!
1. You can delete the `face-training` folder now if you want.

Repeat this for all the people you'd like to match and the validator will make sure at least one of them is present in the image generated.

# Bye!

If you'd like to provide any additional plugins (like sources or filters), please fork the repo and open a PR!
