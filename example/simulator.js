const ZwackBLE = require("../lib/zwack-ble-sensor");
const readline = require("readline");
const parseArgs = require("minimist");

const args = parseArgs(process.argv.slice(2));

let containsFTMS = false;
let containsRSC = false;
let containsCSP = false;
let containsSPD = false;
let containsPWR = false;
let containsCAD = false;

if (args.variable === undefined) {
  console.error(
    "Error: variable parameter is required eg: npm run simulator -- --variable=ftms"
  );
  process.exit(1);
} else {
  containsFTMS = args.variable.includes("ftms");
  containsRSC = args.variable.includes("rsc");
  containsCSP = args.variable.includes("csp");
  containsSPD = args.variable.includes("speed");
  containsPWR = args.variable.includes("power");
  containsCAD = args.variable.includes("cadence");
}

// default parameters
let cadence = 90;
let power = 130;
let powerMeterSpeed = 18; // kmh
let powerMeterSpeedUnit = 2048; // Last Event time expressed in Unit of 1/2048 second
let runningCadence = 180;
let runningSpeed = 10; // 6:00 minute mile
let hr = 130;
let randomness = 50;
let cadRandomness = 10;
let hrRandomness = 5
let sensorName = "Zwift Hub";

let incr = 5;
let runningIncr = 0.5;
let stroke_count = 0;
let wheel_count = 0;
let wheel_circumference = 2096; // milimeter
let notificationInterval = 1000;
let hrUpdateInterval = 5000;
let watts = power;
let hrNoise = 0;

let prevCadTime = 0;
let prevCadInt = 0;

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const zwackBLE = new ZwackBLE({
  name: sensorName,
  modelNumber: "ZW-38BC",
  serialNumber: "06-C8673287492DE",
});

process.stdin.on("keypress", (str, key) => {
  if (key.name === "x" || key.name == "q" || (key.ctrl && key.name == "c")) {
    process.exit(); // eslint-disable-line no-process-exit
  } else if (key.name === "l") {
    listKeys();
  } else {
    if (key.shift) {
      factor = incr;
      runFactor = runningIncr;
    } else {
      factor = -incr;
      runFactor = -runningIncr;
    }

    switch (key.name) {
      case "c":
        cadence += factor;
        if (cadence < 0) {
          cadence = 0;
        }
        if (cadence > 200) {
          cadence = 200;
        }
        break;
      case "p":
        power += factor;
        if (power < 0) {
          power = 0;
        }
        if (power > 2500) {
          power = 2500;
        }
        break;
      case "h":
        hr += factor;
        if (hr < 80) {
          hr = 80;
        }
        if (hr > 190) {
          hr = 190;
        }
        break;
      case "r":
        randomness += factor;
        if (randomness < 0) {
          randomness = 0;
        }
        break;
      case "t":
        cadRandomness += factor;
        if (cadRandomness < 0) {
          cadRandomness = 0;
        }
        break;
      case "n":
        hrRandomness += factor;
        if (hrRandomness < 0) {
          hrRandomness = 0;
        }
        break;
      case "s":
        runningSpeed += runFactor;
        if (runningSpeed < 0) {
          runningSpeed = 0;
        }

        powerMeterSpeed += runFactor;
        if (powerMeterSpeed < 0) {
          powerMeterSpeed = 0;
        }
        break;
      case "d":
        runningCadence += runFactor;
        if (runningCadence < 0) {
          runningCadence = 0;
        }
        break;
      case "i":
        incr += Math.abs(factor) / factor;
        if (incr < 1) {
          incr = 1;
        }
        break;
      case "0":
        power = 0;
        cadence = 0;
        hr = 100;
        break;
      case "1":
        power = 130;
        cadence = 90;
        hr = 130;
        break;
      case "2":
        power = 190;
        cadence = 90;
        hr = 160
        break;
      case "3":
        power = 250;
        cadence = 90;
        hr = 170
        break;
      default:
        listKeys();
    }
    listParams();
  }
});

// Simulate Cycling Power - Broadcasting Power & Cadence
// let notifyPowerCPC = function() {
//   watts = Math.floor(Math.random() * randomness + power);
//
//   stroke_count += 1;
//   if( cadence <= 0) {
//     cadence = 0;
//     setTimeout(notifyPowerCPC, notificationInterval);
//     return;
//   }
//
//   try {
//     zwackBLE.notifyCSP({'watts': watts, 'rev_count': stroke_count });
//   }
//   catch( e ) {
//     console.error(e);
//   }
//
//   setTimeout(notifyPowerCPC, notificationInterval);
// };

// Simulate Cycling Power - Broadcasting Power ONLY
let notifyPowerCSP = function () {
  watts = Math.floor(Math.random() * randomness + power);

  try {
    zwackBLE.notifyCSP({ watts: watts });
  } catch (e) {
    console.error(e);
  }

  setTimeout(notifyPowerCSP, notificationInterval);
};

// Simulate FTMS Smart Trainer - Broadcasting Power and Cadence
let notifyPowerFTMS = function () {
  watts = power > 0 ? Math.floor(Math.random() * randomness + power) : 0;
  rpm = cadence > 0 && power > 0 ? Math.floor(Math.random() * cadRandomness + cadence) : 0;
  
  // Adding randomness and noise to heart rate
  const heart_rate = hr > 89 ? hr + hrNoise : undefined;

  try {
    zwackBLE.notifyFTMS({ watts, cadence: rpm, heart_rate });
  } catch (e) {
    console.error(e);
  }

  setTimeout(notifyPowerFTMS, notificationInterval);
};

// Separate function for updating heart rate with a different interval
let updateHeartRate = function () {
  // Update heart rate noise
  hrNoise = Math.floor(Math.random() * hrRandomness) - hrRandomness / 2; // Adjust the range as needed

  // Set the interval for heart rate updates
  setTimeout(updateHeartRate, hrUpdateInterval);
};

// Simulate Cycling Power - Broadcasting Power and Cadence
let notifyCadenceCSP = function () {
  stroke_count += 1;
  if (cadence <= 0) {
    cadence = 0;
    setTimeout(notifyCadenceCSP, notificationInterval);
    return;
  }
  try {
    zwackBLE.notifyCSP({ watts: watts, rev_count: stroke_count });
  } catch (e) {
    console.error(e);
  }

  setTimeout(
    notifyCadenceCSP,
    (60 * 1000) / (Math.random() * randomness + cadence)
  );
};

// Simulate Cycling Power - Broadcasting Power and Cadence & Speed
// This setup is NOT ideal. Cadence and Speed changes will be erratic
//   - takes ~2 sec to stabilize and be reflected in output
//   - will be unable to inject randomness into the output
//   - will need help on how to improve it
let notifyCPCS = function () {
  // https://www.hackster.io/neal_markham/ble-bicycle-speed-sensor-f60b80
  let spd_int = Math.round(
    (wheel_circumference * powerMeterSpeedUnit * 60 * 60) /
      (1000 * 1000 * powerMeterSpeed)
  );
  watts = Math.floor(Math.random() * randomness + power);

  //   let cad_int = Math.round(60 * 1024/(Math.random() * randomness + cadence));
  let cad_int = Math.round((60 * 1024) / cadence);
  let now = Date.now();
  let cad_time = 0;

  wheel_count += 1;
  if (powerMeterSpeed <= 0) {
    powerMeterSpeed = 0;
    setTimeout(notifyCPCS, notificationInterval);
    return;
  }

  if (cad_int != prevCadInt) {
    cad_time = (stroke_count * cad_int) % 65536;
    let deltaCadTime = cad_time - prevCadTime;
    let ratioCadTime = deltaCadTime / cad_int;
    if (ratioCadTime > 1) {
      stroke_count = stroke_count + Math.round(ratioCadTime);
      cad_time = (cad_time + cad_int) % 65536;
      prevCadTime = cad_time;
    }
  } else {
    stroke_count += 1;
    cad_time = (stroke_count * cad_int) % 65536;
  }

  prevCadTime = cad_time;
  prevCadInt = cad_int;

  if (cadence <= 0) {
    cadence = 0;
    setTimeout(notifyCPCS, notificationInterval);
    return;
  }

  try {
    zwackBLE.notifyCSP({
      watts: watts,
      rev_count: stroke_count,
      wheel_count: wheel_count,
      spd_int: spd_int,
      cad_int: cad_int,
      cad_time: cad_time,
      cadence: cadence,
      powerMeterSpeed: powerMeterSpeed,
    });
  } catch (e) {
    console.error(e);
  }

  setTimeout(notifyCPCS, notificationInterval);
  //   setTimeout(notifyCPCS, spd_int);
};

// Simulate Running Speed and Cadence - Broadcasting Speed and Cadence
let notifyRSC = function () {
  try {
    zwackBLE.notifyRSC({
      speed: toMs(Math.random() + runningSpeed),
      cadence: Math.floor(Math.random() * 2 + runningCadence),
    });
  } catch (e) {
    console.error(e);
  }

  setTimeout(notifyRSC, notificationInterval);
};

function listParams() {
  console.log(`\nBLE Sensor parameters:`);
  console.log(`\nHeart Rate:`);
  console.log(`             HR: ${hr} bpm`);
  console.log(`  HR Randomness: ${hrRandomness}`);

  console.log(`\nCycling:`);
  console.log(`      Power: ${power} W`);
  console.log(`    Cadence: ${cadence} RPM`);
  console.log(`      Speed: ${powerMeterSpeed} km/h`);

  console.log("\nRunning:");

  console.log(`      Speed: ${runningSpeed} m/h, Pace: ${speedToPace(runningSpeed)} min/mi`);
  console.log(`    Cadence: ${Math.floor(runningCadence)} steps/min`);

  console.log("\nEtc:");
  console.log(`\nPower/Speed Randomness: ${randomness}`);
  console.log(`      Cadence Randomness: ${cadRandomness}`);
  console.log(`               Increment: ${incr}`);
  console.log("\n");
}

function listKeys() {
  console.log(`\nList of Available Keys`);
  console.log("c/C - Decrease/Increase cycling cadence");
  console.log("p/P - Decrease/Increase cycling power");

  console.log("s/S - Decrease/Increase running speed");
  console.log("d/D - Decrease/Increase running cadence");

  console.log("\nr/R - Decrease/Increase power/speed randomness");
  console.log("\nt/T - Decrease/Increase cadence randomness");
  console.log("i/I - Decrease/Increase parameter increment");
  console.log("x/q - Exit");
  console.log();
}

function speedToPace(speed) {
  if (speed === 0) {
    return "00:00";
  }
  let t = 60 / speed;
  let minutes = Math.floor(t);
  let seconds = Math.floor((t - minutes) * 60);
  return (
    minutes.toString().padStart(2, "0") +
    ":" +
    seconds.toString().padStart(2, "0")
  );
}

function toMs(speed) {
  return (speed * 1.60934) / 3.6;
}

function kmhToMs(speed) {
  return speed / 3.6;
}

// Main
console.log(`[ZWack] Faking test data for sensor: ${sensorName}`);
console.log(`[ZWack]  Advertising these services: ${args.variable}`);

listKeys();
listParams();

// Comment or Uncomment each line depending on what is needed
if (containsCSP && containsPWR && !containsCAD && !containsSPD) {
  notifyPowerCSP();
} // Simulate Cycling Power Service - Broadcasting Power ONLY
if (containsCSP && containsPWR && containsCAD && !containsSPD) {
  notifyCadenceCSP();
} // Simulate Cycling Power Service  - Broadcasting Power and Cadence
if (containsCSP && containsPWR && containsCAD && containsSPD) {
  notifyCPCS();
} // Simulate Cycling Power Service - Broadcasting Power and Cadence and Speed
if (containsFTMS) {
  notifyPowerFTMS();
  updateHeartRate();
} // Simulate FTMS Smart Trainer - Broadcasting Power and Cadence
if (containsRSC) {
  notifyRSC();
} // Simulate Running Speed and Cadence - Broadcasting Speed and Cadence
