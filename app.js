'use strict';

const Homey       = require('homey');
const Tami4Api    = require("./lib/Tami4Api");
const Tami4OTPApi = require("./lib/Tami4OTPApi");

const REFRESH_TOKEN_INTERVAL = 3*60*60*1000; //3 hours

var refreshTokenIntervalID   = null;


class Tami4App extends Homey.App {

  /**
  * Create a new API object
  * @param {string} token the token to use
  */
  async #createApi(token, refreshToken) {
      this.tami4Api = new Tami4Api(token,refreshToken);
      try {
        await this.tami4Api.refreshToken();
        if (!refreshTokenIntervalID) {
          refreshTokenIntervalID = setInterval(async () => await this.tami4Api.refreshToken(), REFRESH_TOKEN_INTERVAL);
        }
      } catch (err) {
        this.error("Failed to create a new API");
        this.error(err);
      }
  }

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {

    //Initialize OTP-API
    this.tami4OTPApi = new Tami4OTPApi(
      {
        ar : 1,
        k : "6Lf-jYgUAAAAAEQiRRXezC9dfIQoxofIhqBnGisq",
        co : "aHR0cHM6Ly93d3cudGFtaTQuY28uaWw6NDQz",
        hl : "en",
        v : "gWN_U6xTIPevg0vuq7g1hct0",
        size : "invisible",
        cb : "ji0lh9higcza"
      }
    );

    //DEBUG
    //Reset all settings
    //  for (let key of Object.values(this.homey.settings.getKeys())) {
    //    this.homey.settings.unset(key);
    // }

    //Upon setting configuration, go over the process of acquiring a token
    this.homey.settings.on('set', async(elementName) => {
      if (elementName === "phoneNumber") {
        var phoneNumber = this.homey.settings.get("phoneNumber");
        await this.tami4OTPApi.sendOTPSMS(phoneNumber);
      } else if (elementName === "OTP") {
        var phoneNumber = this.homey.settings.get("phoneNumber");
        var OTP = this.homey.settings.get("OTP");
        var token = await this.tami4OTPApi.getTokenByOTP(phoneNumber,OTP);

        await this.#createApi(token.accessToken, token.refreshToken);

        this.homey.settings.set("phone1",phoneNumber);
        this.homey.settings.set("token1",token.accessToken);  
        this.homey.settings.set("refreshToken1",token.refreshToken);  
        this.homey.settings.unset("phoneNumber");
        this.homey.settings.unset("OTP");  
      }
    });

    //Token is written in the "token1" settings. Initilize API object by using it
    var token = this.homey.settings.get("token1");
    var refreshToken = this.homey.settings.get("refreshToken1");
    if (token) {
      await this.#createApi(token,refreshToken);
    } else {
      this.tami4Api = null;
    }

    //Actions Cards Flows ('THEN')
    this.homey.flow.getActionCard('boil_water').registerRunListener(async (args, state) => {
      //'args' is the device that triggered the flow
      var status = await this.homey.app.tami4Api.boilWater(args.device.getData().id);
      if (status == 1) {
        throw new Error("Water are already hot, no need to boil");
      } else if (status == -1) {
        throw new Error("Error in boiling water");
      }
    });

    var prepareDrinksFlowCard = this.homey.flow.getActionCard('prepare_drink');
    prepareDrinksFlowCard.registerArgumentAutocompleteListener(
      'drink_name', 
      async (query, args) => {
        //args.device is holding the device
        return args.device.drinks;
    });
    prepareDrinksFlowCard.registerRunListener(async (args,state) => {
      var status = await this.homey.app.tami4Api.prepareDrink(args.device.getData().id, args.drink_name.id);
      if (status == -1) {
        throw new Error("Error in preparing drink");
      }
    });

   //Triggers Cards Flows ('WHEN')
   this.filterReplacementTriggerCard = this.homey.flow.getDeviceTriggerCard('filter_replacement');
   this.uvReplacementTriggerCard = this.homey.flow.getDeviceTriggerCard('uv_lamp_replacement');

   this.filterRelacementDaysTriggerCard = this.homey.flow.getDeviceTriggerCard('filter_replacement_in_a_few_days');
   this.filterRelacementDaysTriggerCard.registerRunListener(async (args, state) => {
     // args is the user input, e.g { 'days': '7' }
     // state is the parameter passed in trigger()
     return args.days === state.days;
   });

   this.uvReplacementsDaysTriggerCard = this.homey.flow.getDeviceTriggerCard('uv_lamp_replacement_in_a_few_days');
   this.uvReplacementsDaysTriggerCard.registerRunListener(async (args, state) => {
     // args is the user input, e.g { 'days': '7' }
     // state is the parameter passed in trigger()
     return args.days === state.days;
   });


   // Conditions Cards Flows ('AND')
   this.homey.flow.getConditionCard('uv_lamp_replacement').registerRunListener(async (args, state) => {
     return parseInt(args.device.getCapabilityValue('uv_lamp_remaining_days')) <= 0;
   });

   this.homey.flow.getConditionCard('filter_replacement').registerRunListener(async (args, state) => {
     return parseInt(args.device.getCapabilityValue('filter_remaining_days')) <= 0;
   });

   this.homey.flow.getConditionCard('uv_lamp_replacement_in_a_few_days').registerRunListener(async (args, state) => {
     // args is the user input, e.g { 'days': '7' }
     return parseInt(args.days) >= parseInt(args.device.getCapabilityValue('uv_lamp_remaining_days'));
   });

   this.homey.flow.getConditionCard('filter_replacement_in_a_few_days').registerRunListener(async (args, state) => {
     // args is the user input, e.g { 'days': '7' }
     return parseInt(args.days) >= parseInt(args.device.getCapabilityValue('filter_remaining_days'));
   });
  }
}

module.exports = Tami4App;
