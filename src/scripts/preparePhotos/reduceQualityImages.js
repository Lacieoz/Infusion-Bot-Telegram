/* RESIZE OPTIMIZE IMAGES */
const Jimp = require('jimp');
var fs = require('fs');

let inputPath = 'files\\reduceQualityInput\\'
let outputPath = 'files\\reduceQualityOutput\\' 

/**
 * Resize + optimize images.
 *
 * @param Array images An array of images paths.
 * @param Number width A number value of width e.g. 1920.
 * @param Number height Optional number value of height e.g. 1080.
 * @param Number quality Optional number value of quality of the image e.g. 90.
 */
async function changeQualityImage(imagesPath, quality) {
	
	
	for (let imgPath of imagesPath) {
		const image = await Jimp.read(inputPath + imgPath);
		await image.quality(quality);
		
		let splitted = imgPath.split(".");
		let imgPathOutput = splitted[0] + ".jpg"
		
		await image.writeAsync(outputPath + imgPathOutput);
		console.log("wrote image " + imgPathOutput)
	}
	
};

async function main() {
	let imagesPath = await fs.readdirSync(inputPath);
	
	let quality = 10
	console.log("STARTING, compression with quality " + quality)
	await changeQualityImage(imagesPath, quality)
	console.log("FINITO")
	process.exit(1)
}



main ()


