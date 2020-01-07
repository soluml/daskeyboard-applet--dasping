const assert = require("assert");
const { DasPing } = require("../index.js");

function getDefaultConfig(config) {
  return {
    applet: {
      defaults: {
        address: "www.google.com",
        colorGood: "#00FF00",
        colorBad: "#FF0000",
        colorFail: "#FF00FF",
        midSteps: 3,
        pingThreshold: 300,
        pollingInterval: 60000,
        stepGap: 100,
        ...config
      }
    }
  };
}

describe("Das Ping: #run()", () => {
  let App;

  beforeEach(() => {
    App = new DasPing();
  });

  it("successfully pings www.google.com.", async () => {
    const config = getDefaultConfig();

    await App.processConfig(config);

    const signal = await App.run();
    const { color } = signal.points[0][0];

    assert.ok(color);
    assert.notEqual(color, config.applet.defaults.colorFail);
  });
});
