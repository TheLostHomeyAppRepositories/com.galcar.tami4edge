'use strict';

const { Device } = require('homey');

const REFRESH_SETTINGS_INTERVAL  = 60*1000;       //1 minute
const REFRESH_FILTER_UV_INTERVAL = 24*60*60*1000; //24 hours
const NUM_ERRORS_THRESHOLD       = 5;             //allow 5 retries of periodic functions until throwing an exception

class Tami4EdgePlusDevice extends Device {

  #numOfErrors;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {

    this.#numOfErrors = 0;
    this.registerCapabilityListener("boil_water", async (value) => {
      var status = await this.homey.app.tami4Api.boilWater(this.getData().id);
      if (status == 1) {
        throw new Error("Water are already hot, no need to boil");
      } else if (status == -1) {
        throw new Error("Error in boiling water");
      }
    });

    await this.refreshSettings();
    if (!this.refreshSettingsIntervalID) {
      this.refreshSettingsIntervalID = setInterval(async () => await this.refreshSettings(), REFRESH_SETTINGS_INTERVAL);
    }

    await this.refreshFileterUV();
    if (!this.refreshFilterUVIntervalID) {
      this.refreshFilterUVIntervalID = setInterval(async () => await this.refreshFileterUV(), REFRESH_FILTER_UV_INTERVAL);
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Tami4EdgePlusDevice has been added'); 
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    var config = {
      "smartHeatingMode": newSettings.smart_heating_mode,
      "lightning": newSettings.lightning,
      "buttonsSound": newSettings.buttons_sound,
      "nightMode": newSettings.night_mode,
      "pushAndDrink": newSettings.push_and_drink,
      "energySaveMode": newSettings.save_energy_mode
    }

    try {
      await this.homey.app.tami4Api.setConfiguration(this.getData().id, config);
    } catch (err) {
      this.error("Error setting device configuration");
      this.error(err);
    }
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Tami4EdgePlusDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Tami4EdgePlusDevice has been deleted');
    if (this.refreshSettingsIntervalID) { clearInterval(this.refreshSettingsIntervalID) };
    if (this.refreshFilterUVIntervalID) { clearInterval(this.refreshFilterUVIntervalID) };
  }

  /**
   * Get settings and the drink-names from the cloud, and set the device with those settings/drinks
   */
  async refreshSettings() {
    try {
      var config = await this.homey.app.tami4Api.getConfiguration(this.getData().id);
      this.#numOfErrors = 0;
    } catch (err) {
      this.error("Error getting device configuration");
      this.error(err);
      this.#numOfErrors ++;
      this.error("Numer of consequential errors: " + this.#numOfErrors);
      if (this.#numOfErrors == NUM_ERRORS_THRESHOLD) {throw new Error("Errors Threashold Limit Reached!")} else { return; };
    }
    await this.setSettings({
      smart_heating_mode : config.smartHeatingMode,
      lightning : config.lightning,
      buttons_sound : config.buttonsSound,
      night_mode : config.nightMode,
      push_and_drink : config.pushAndDrink,
      save_energy_mode : config.energySaveMode
    });
    if (config.childLock) {
      this.setSettings({child_lock_label : "Enabled"});
    } else {
      this.setSettings({child_lock_label : "Disabled"});
    }


    //Get the device's drinks and udpate them
    this.drinks = [];
    // From some reason, Tami4API does not allow preparing generic drinks, only user drinks. So this is commented out :-(
    // var genericDrinks = await this.homey.app.tami4Api.getGenericDrinks(this.getData().id);
    // for (let drink of Object.values(genericDrinks)) {
    //   this.drinks.push({ id: drink.id, name: drink.name });
    // }
    try {
      var userName = await this.homey.app.tami4Api.getCurrentUserName();
      var userDrinks = await this.homey.app.tami4Api.getUserDrinks();
      this.#numOfErrors = 0;
    } catch (err) {
      this.error("Error getting device username / drinks");
      this.error(err);
      this.#numOfErrors ++;
      this.error("Numer of consequential errors: " + this.#numOfErrors);
      if (this.#numOfErrors == NUM_ERRORS_THRESHOLD) {throw new Error("Errors Threashold Limit Reached!")} else { return; };
    }
    for (let drink of Object.values(userDrinks)) {
      this.drinks.push({ id: drink.id, name: userName + " - " + drink.name });
    }
  }

  /**
   * Get the date to replace filter and uv-lamp, update the device with the the time remaining to relace them
   */
  async refreshFileterUV() {
    try {
      var filterUvInfo = await this.homey.app.tami4Api.getFilterUVInfo();
      this.#numOfErrors = 0;
    } catch (err) {
      this.error("Error getting filter/uv info");
      this.error(err);
      this.#numOfErrors ++;
      this.error("Numer of consequential errors: " + this.#numOfErrors);
      if (this.#numOfErrors == NUM_ERRORS_THRESHOLD) {throw new Error("Errors Threashold Limit Reached!")} else { return; };
    }
    var filterReplacementDays = Math.trunc((filterUvInfo.filterInfo.upcomingReplacement - Date.now())/1000/60/60/24);
    var uvReplacementDays = Math.trunc((filterUvInfo.uvInfo.upcomingReplacement - Date.now())/1000/60/60/24);

    this.setCapabilityValue("filter_remaining_days", filterReplacementDays);
    this.setCapabilityValue("uv_lamp_remaining_days", uvReplacementDays);

    await this.homey.app.uvReplacementsDaysTriggerCard.trigger(this,{},{days : uvReplacementDays});
    await this.homey.app.filterRelacementDaysTriggerCard.trigger(this,{},{days : filterReplacementDays});
    if (uvReplacementDays == "0") { await this.homey.app.uvReplacementTriggerCard.trigger(this) };
    if (filterReplacementDays == "0") { await this.homey.app.filterReplacementTriggerCard.trigger(this) };
  }
}

module.exports = Tami4EdgePlusDevice;
