const sdk = require('cue-sdk')
const readline = require('readline')
const price = require('crypto-price');
const settings = require('./config.json');

const input_queue = []
let oldPrice = 0
let r =2,g =2,b = 2;

readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)
process.stdin.on('keypress', (key, data) => {
  if (data.sequence === '\u0003') {
    // ^C
    exit()
  }
  input_queue.push(key)
});

function exit(code = 0) {
  console.log('Exiting.')
  process.exit(code)
}

function getAvailableLeds() {
  const leds = []
  const deviceCount = sdk.CorsairGetDeviceCount()
  for (let di = 0; di < deviceCount; ++di) {
    const ledPositions = sdk.CorsairGetLedPositionsByDeviceIndex(di)
    leds.push(ledPositions.map(p => ({ ledId: p.ledId, r: 0, g: 0, b: 0 })))
  }

  if (!leds.length) {
    console.error('No devices found')
    exit(1)
  }

  return leds
}

function setColor(allLeds){

  getPrice().then((obj) => {

    let newPrice = obj.price;

    if(newPrice === oldPrice){
      //Price hasn't changed continue
      return;
    }

    if(newPrice > oldPrice){
      //Price has gone up
      r = settings.price_up.r;
      g = settings.price_up.g;
      b = settings.price_up.b;
    }
    else {
      //Price went down
      r = settings.price_down.r;
      g = settings.price_down.g;
      b = settings.price_down.b;
    }

    //Update last price.
    oldPrice = newPrice;

    const cnt = allLeds.length;
    for (let di = 0; di < cnt; ++di) {
        const device_leds = allLeds[di]
        device_leds.forEach(led => {
          led.r = r
          led.g = g
          led.b = b
        });
        
    sdk.CorsairSetLedsColorsBufferByDeviceIndex(di, device_leds)
    }
        sdk.CorsairSetLedsColorsFlushBuffer()
  })
  .catch((error) => {
    console.log(error);
  });
}


function getPrice(){
  return price.getCryptoPrice("USD", settings.crypto);
}

function initCorsair(){
  const details = sdk.CorsairPerformProtocolHandshake()
  const errCode = sdk.CorsairGetLastError()
  if (errCode !== 0) {
      console.error(`Handshake failed: ${sdk.CorsairErrorString[errCode]}`)
      exit(1)
  }

}


function main(){

  //Perform the corsair handshake
  initCorsair();

    const availableLeds = getAvailableLeds()

    function loop(leds, waveDuration, x) {

        if (input_queue.length > 0) {
            const input = input_queue.shift()
            if (input === 'q' || input === 'Q') {
              exit(0)
            }
          }

        setColor(leds)
        const interval = settings.interval * 1000

        return setTimeout(
            loop,
            interval,
            leds,
          )
    }

    return loop(availableLeds, 50000, 0)
}

main()