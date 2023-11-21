'use strict';

const { Driver } = require('homey');


class Tami4EdgePlusDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Tami4EdgePlusDriver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    if (this.homey.app.tami4Api == null) {
      //The user did not go to app configuration and wenth through the OTP process to get a token
      throw new Error("The Tami4 App is not configured properly\n. Please go to application settings and configure a token\n");
    }
    var tami4Devices = await this.homey.app.tami4Api.getDevices();
    let devices = [];
    for (let device of Object.values(tami4Devices)) {
      var currentUser = await this.homey.app.tami4Api.getCurrentUserName();
      devices.push({
        data: {
            id: device.id
        },
        capabilities: ["boil_water","uv_lamp_remaining_days","filter_remaining_days"],
        name: 'Tami4 - ' + currentUser
      });
    }
    return devices;
  }
}

module.exports = Tami4EdgePlusDriver;
