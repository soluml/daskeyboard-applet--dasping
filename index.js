const q = require("daskeyboard-applet");
const { execSync } = require("child_process");
const { logger } = q;
const pingCountArg = process.platform === "win32" ? "-n" : "-c";
const timeRe = / time=(\d+\.?\d*)\s?ms/gi;

function buildColorSteps({
  colorGood,
  colorBad,
  midSteps,
  pingThreshold,
  stepGap
}) {
  const totalSteps = midSteps + 2;
  const colorGoodRGB = hexToRGB(colorGood);
  const colorBadRGB = hexToRGB(colorBad);
  const stepPercentagesReversed = [0].concat(
    new Array(totalSteps - 1)
      .fill(1 / (totalSteps - 1))
      .map((n, i) => (i + 1) * n * 2)
  );
  const stepPercentages = stepPercentagesReversed.slice().reverse();
  const colorSteps = new Array(totalSteps)
    .fill(0)
    .map((_, i) =>
      rgbToHex(
        new Array(3)
          .fill(0)
          .map((_, x) =>
            mergeColorPiece(
              colorGoodRGB[x],
              colorBadRGB[x],
              stepPercentages[i],
              stepPercentagesReversed[i]
            )
          )
      )
    );

  // Assign color step to a predicate
  return colorSteps.map((hex, i) => {
    let predicate = time => time <= pingThreshold + stepGap * i;

    if (i + 1 === totalSteps) {
      predicate = time => time > pingThreshold + stepGap * (i - 1);
    }

    return [hex, predicate];
  });
}

function mergeColorPiece(color1, color2, percentage1, percentage2) {
  return Math.round((color1 * percentage1 + color2 * percentage2) / 2);
}

function hexToRGB(color) {
  return color
    .substr(1)
    .split("")
    .reduce((acc, cur, i) => {
      if (i % 2) {
        acc[acc.length - 1] += cur;
      } else {
        acc.push(cur);
      }

      return acc;
    }, [])
    .map(n => parseInt(n, 16));
}

function rgbToHex(color) {
  return (
    "#" +
    color
      .map(n =>
        Number(n)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

class DasPing extends q.DesktopApp {
  constructor() {
    super();

    this.config = {
      colorGood: "#00FF00",
      colorBad: "#FF0000",
      colorFail: "#FF00FF",
      ...this.config,
      midSteps: parseInt(this.config.midSteps, 10) || 3,
      pingThreshold: parseInt(this.config.pingThreshold, 10) || 300,
      pollingInterval: parseInt(this.config.pollingInterval, 10) || 60000,
      stepGap: parseInt(this.config.stepGap, 10) || 100
    };

    this.colorSteps = buildColorSteps(this.config);
    this.pollingInterval = this.config.pollingInterval;

    logger.info("DasPing applet initialized");
  }

  async run() {
    const { address } = this.config;

    try {
      const output = execSync(`ping ${address} ${pingCountArg} 1`).toString();
      var [, time] = timeRe.exec(output);

      // Reset exec index for next call
      timeRe.lastIndex = 0;

      logger.info(output);
    } catch (error) {
      logger.error(`An error occurred while pinging ${address}: ${error}`);
    }

    return this.buildSignal(time);
  }

  buildSignal(time) {
    let { address, colorFail: color } = this.config;
    const addStr = `URL: ${address}`;
    const dateStr = `Last Checked: ${new Date().toLocaleString()}`;
    let message = `${addStr}; Time: No Response; Color: ${color}; ${dateStr}`;

    if (time) {
      // For five steps between Green and Red:
      //     <=300      <=400      <=500      <=600       >600
      // [ '#00ff00', '#40bf00', '#808000', '#bf4000', '#ff0000' ]
      [color] = this.colorSteps.find(([, predicate]) => predicate(time));
      message = `${addStr}; Time: ${time}ms; Color: ${color}; ${dateStr}`;
    }

    logger.info(message);

    return new q.Signal({
      points: [[new q.Point(color)]],
      name: "Das Ping",
      message
    });
  }
}

module.exports = { DasPing };

new DasPing();
