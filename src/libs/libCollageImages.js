const sharp = require("sharp");

const nSide = 3;
const pixelsSide = 750;

const libUtils = require('./libUtils');

/**
 * Create image with text input
 * @param text : text to insert
 * @param x : row in the grid
 * @param y : column in the grid
 * @returns A buffer of the image with text
*/
async function createTextImage(text, x, y){
  try {

    const width = pixelsSide;
    const height = width;

    // if there are more images, we make the text smaller
    let fontSize = 100 - ( 10 * (nSide) )

    let percSingleSide = 100 / nSide;

    // calculate the position (percentage wise) of the text, based on the image position in the grid
    let percX = percSingleSide * (x + 1 - (text.length * 0.1));
    let percY = percSingleSide * (y + 0.9);

    const svgImage = `
    <svg width="${width}" height="${height}">
      <style>
      .title { fill="red"; font-family: "'sans serif'"; font-size: ${fontSize}px; font-weight: bold;}
      </style>
      <text x="${percX}%" y="${percY}%" text-anchor="middle" class="title" fill="red">${text}</text>
    </svg>
    `;
    
    const svgBuffer = Buffer.from(svgImage);
    const image = await sharp(svgBuffer)
      // png format keeps transparent area
      .toFormat('png')
      // to buffer create the image and changes the metadata
      .toBuffer();

    return image;

  } catch (error) {
    console.log(error);
  }
}

/**
 * Create image grid like 
 * @param path : image path on file system
 * @param x : row in the grid
 * @param y : column in the grid
 * @returns A buffer of the image ready to be mixed with other ones
*/
async function createImage(path, x, y) {
  let onePart = pixelsSide / nSide;

  let image = sharp(path)
      // resize to 1 square (of the grid n x n)
      .resize({ width: onePart, height: onePart })
      // create the empty spaces, to create an image with the final size
      .extend({
        top: onePart * y,
        bottom: onePart * (nSide - (y + 1)),
        left: onePart * x,
        right: onePart * (nSide - (x + 1)),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      // png format keep trace of transparent area
      .toFormat('png')
      // to buffer to change the metadata of the image and creating the new image
      .toBuffer();
  return image;
}

/**
 * Create image grid like 
 * @param paths : array of str with paths of the images to mix
 * @param ids : array of ids of the infusions
 * @returns A buffer of the collage image
*/
exports.createCompositeImage = async function (paths, ids) {
  
  libUtils.writeLog("starting creation collage");
  let images = []

  // we create all the images to fix togeter, infusion images and the images with text (the id)
  // we just create the promises to make use of parallelization
  for (let i = 0; i < nSide * nSide && i < paths.length; i++) {

    // coordinates in the grid, position given by [x, y]
    let x = i % nSide;
    let y = Math.floor(i / nSide);

    let image = createImage(paths[i], x, y)
    images.push(image);

    let text = createTextImage(ids[i].toString(), x, y);
    images.push(text);
  }  

  // we create the final image, mixing all images created
  let imageBuffer = Promise.all(images).then(async values => {
    let compositeArray = []; 
    for (let i = 1; i < values.length; i++)
      compositeArray.push({ input: values[i]});

    return sharp(values[0])
      .composite(compositeArray)
      .toFormat('png').toBuffer();

  });

  libUtils.writeLog("end creation collage");

  return imageBuffer;

}

exports.getNImagesPage = function () {
    return nSide * nSide;
}
