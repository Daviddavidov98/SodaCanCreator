/*
=-=-=-=-=-=-=-=-=-=-=-=-
Comment (Required): This program builds a user's sodacan 
image based on the form the user filled out. It uses Jimp 
to compile the images together and change their colors as 
well.
=-=-=-=-=-=-=-=-=-=-=-=-
*/

const http = require('http');
const Jimp = require('jimp');
const fs = require('fs');
const url = require('url');

//delivers the can image to the webpage
const deliver_can = function(filename, res){
    const main = fs.createReadStream(filename);
    res.writeHead(200, {'Content-Type': 'image/png'});
    main.pipe(res);
};
//compiles the can based on the user input using Jimp.blit
const create_can = function(can, rgbColor, flavor, res){
    let new_can = can.body.resource.clone();
    let colored_can = new_can.color([
        {apply: "red", params: [rgbColor.r]},
        {apply: "green", params: [rgbColor.g]},
        {apply: "blue", params: [rgbColor.b]},
    ]);
    can.lid.resource.blit(colored_can, 0, 0);
    can.lid.resource.blit(can.label.resource, 40, 210);
    can.lid.resource.blit(flavor.resource, flavor.x, flavor.y);
    new_can = can.lid.resource.clone();
    const filename = `${rgbColor.r}${rgbColor.g}${rgbColor.b}${flavor.id}.png`;
    new_can.write(filename, () => deliver_can(filename, res) );
}
//Converts the hexadecimal user inputted color to an rgb obj
function hexToRGB(hexColor){
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    return (
        result
        ? {r: parseInt(result[1], 16), 
           g: parseInt(result[2], 16), 
           b: parseInt(result[3], 16)}
        : {r: 255, g: 255, b: 255}
    );
}

//starts the server listening to port 3000
const start_server = function(can, flavors){
    const server = http.createServer();
    const port = 3000;
    server.on('listening', function(){
        console.log(`Now listening to port ${port}`);
    })
    server.listen(port);
    server.on('request', connection_handler);
    function connection_handler(req, res){
        console.log(`New request for ${req.url} from ${req.socket.remoteAddress}`);
        if(req.url === '/'){
            const main = fs.createReadStream('html/form.html');
            res.writeHead(200, {'Content-Type': 'text/html'});
            main.pipe(res);
        }
        else if(req.url === '/image-credits.txt'){
            const main = fs.createReadStream('assets/image-credits.txt');
            res.writeHead(200, {'Content-Type' : 'text/plain'});
            main.pipe(res);
        }
        //the output/result page
        else if(req.url.startsWith('/design')){
            const user_input = url.parse(req.url, true).query
            const rgbColor = hexToRGB(user_input.color);
            let i = flavors.findIndex(flavor => flavor.id === user_input.flavor);
            //if the flavor is invalid or not in the list of flavors
            if (i === -1){
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.write('404 Not Found!');
                res.end();
            }
            else{
                let filename = `./tmp/${flavors[i].id}-${rgbColor.r}-${rgbColor.g}-${rgbColor.b}.png`;
                //filename we're checking for
                const checkCache = `${rgbColor.r}${rgbColor.g}${rgbColor.b}${flavors[i].id}.png`;
                fs.access(checkCache, fs.constants.F_OK, (err)=>{
                    if(err){
                        //image not in cache;
                        create_can(can, rgbColor, flavors[i], res);
                    }
                    else {
                        //if image has been downloaded
                        console.log('Image in cache aready')
                        deliver_can(checkCache, res);
                    }
                })
                
                
            }
        }
        else {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.write('404 Not Found!');
            res.end();
        }
    }


};
const open_assets = function(){
    let imageCounter = 0;
    const can = {
        lid: {path: "assets/can/can-lid.png"},
        body: {path: "assets/can/can-body.png"},
        label: {path: "assets/can/can-label.png"}
    };
    const flavors = [
        {id: "apple", path: "assets/flavor/apple.png", x: 120, y: 265},
        {id: "banana", path: "assets/flavor/banana.png", x: 80, y: 285},
        {id: "cherry", path: "assets/flavor/cherry.png", x: 100, y: 250},
        {id: "coconut", path: "assets/flavor/coconut.png", x: 110, y: 270},
        {id: "crab", path: "assets/flavor/crab.png", x: 83, y: 305},
        {id: "grape", path: "assets/flavor/grape.png", x: 93, y: 268},
        {id: "mango", path: "assets/flavor/mango.png", x: 100, y: 295},
        {id: "orange", path: "assets/flavor/orange.png", x: 90, y: 265},
        {id: "watermelon", path: "assets/flavor/watermelon.png", x: 75, y: 280}
    ];
    for (let property in can){
        Jimp.read(can[property].path, (err, image) => {
            if(err){
                throw err;
            }
            can[property].resource = image;
            imageCounter++;
        })
    }
    for (let i = 0; i < flavors.length; i++){
        Jimp.read(flavors[i].path, (err, image) =>{
            if(err) {
                throw err;
            }
            flavors[i].resource = image;
            imageCounter++
            if(imageCounter === flavors.length+3){
                start_server(can, flavors);
            }
        })
    }
};
open_assets();

