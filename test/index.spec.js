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
        ...config,
      },
    },
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

  it("successfully handles response time less than 1ms (<1ms).", async () => {
    const config = getDefaultConfig({ address: "localhost" });

    await App.processConfig(config);

    const signal = await App.run();
    const { color } = signal.points[0][0];

    assert.ok(color);
    assert.notEqual(color, config.applet.defaults.colorFail);
  });

  it("gracefully handles a failed ping due to dns resolution failure.", async () => {
    const config = getDefaultConfig({ address: "HOPEFULLYTHISDOESNOTEXIST" });

    await App.processConfig(config);

    const signal = await App.run();
    const { color } = signal.points[0][0];

    assert.ok(color);
    assert.equal(color, config.applet.defaults.colorFail);
  });

  it("gracefully handles a failed ping due to routing failure.", async () => {
    const config = getDefaultConfig({ address: "0.0.0.0" });

    await App.processConfig(config);

    const signal = await App.run();
    const { color } = signal.points[0][0];

    assert.ok(color);
    assert.equal(color, config.applet.defaults.colorFail);
  });
});
