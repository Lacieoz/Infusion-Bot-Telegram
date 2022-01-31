const sharp = require("sharp");
const { performance } = require('perf_hooks');

const nSide = 3;
const pixelsSide = 1080

function showMemoryUsage() {
  console.log("Process: %s - %s MB ", new Date(), process.memoryUsage().rss / 1048576);
}

function showPerformance(startTime) {
  let endTime = performance.now()
  console.log(`Call to createCompositeImage took ${endTime - startTime} milliseconds`)
}


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
    let fontSize = 120 - ( 10 * (nSide) )

    let percSingleSide = 100 / nSide;

    // calculate the position (percentage wise) of the text, based on the image position in the grid
    let percX = percSingleSide * (x + 1 - (text.length * 0.1));
    let percY = percSingleSide * (y + 0.9);

    const svgImage = `
    <svg width="${width}" height="${height}">
      <style>
      .title { fill="red"; font-size: ${fontSize}px; font-weight: bold;}
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
createCompositeImage = async function (paths, ids) {
  
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
  let imageBuffer = await Promise.all(images).then(async values => {
    let compositeArray = []; 
    for (let i = 1; i < values.length; i++)
      compositeArray.push({ input: values[i]});

    return sharp(values[0])
      .composite(compositeArray)
      .png({
        quality: 100
      })
      .toFormat('png').toBuffer();

  });

  return imageBuffer;

}

async function main () {
  
  let paths = []
  let ids = []
  for (let i = 1; i < (nSide * nSide) + 1; i++) {
    paths.push("D:\\Workspace\\InfusionBot\\files\\foto_tisane\\" + i + ".jpg");
    ids.push(i)
  }

  var startTime = performance.now()
  console.log("start")
  let result = await createCompositeImage(paths, ids);
  
  showPerformance(startTime);
  showMemoryUsage()

  sharp(result)
    .png({
      quality: 20
    })
    .toFile('D:\\Workspace\\InfusionBot\\tests\\files\\output.png');
  
  console.log("file written")

}

main();

