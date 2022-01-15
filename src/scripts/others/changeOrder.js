const fs = require('fs');
const { mainModule } = require('process');

let toRemove = [14, 15]
let toAdd = [26, 39, 85]

async function main () {
    let count = 0;
    let flag = false
    for (let i = 1; i <= 121; i++) {
        for (let num of toAdd) {
            if (i + count == num) {
                count++
            }
        }
        for (let num of toRemove) {
            if (i == num) {
                count--
                flag = true
            }
        }
        if (flag) {
            flag = false
        } else {
            await fs.copyFile('D:\\Workspace\\InfusionBot\\files\\foto_tisane' + (i) + '.jpg', 
                        'D:\\Workspace\\InfusionBot\\files\\foto_tisane_new\\' + (i + count) + '.jpg', (err) => {
                if (err) throw err;
                console.log('File ' + (i + count) + ' was copied to destination');
            });
        }
    }
}

main()