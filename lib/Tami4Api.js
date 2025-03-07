'use strict';

const GetPost = require("./GetPost");
var path = require('path');

class Tami4Api {
  #token;
  #refreshToken;
  #headers;
  #getPost;
  
  constructor(token,refreshToken) {
    this.#token = token;
    this.#refreshToken = refreshToken;
    this.#headers = {
        "Accept" : "application/json, text/plain, */*",
        "Connection" : "keep-alive",
        "Accept-Language" : "en-us",
        "User-Agent" : "tami4edge/81 CFNetwork/1333.0.4 Darwin/21.5.0",
        "Content-Type" : "application/json",
        "X-Api-Key": "96787682-rrzh-0995-v9sz-cfdad9ac7072"
      }
    this.#getPost = new GetPost();
    }

     /**
     * Log a string to the colsole with the dat/time and JS filename
     * @param {string} msg the log message
     */
     log(msg) {
      var d = new Date(Date.now());
      if (typeof msg != "string") { 
        console.log(d.toISOString() + " [log] [" + path.basename(__filename) + "]");
        console.log(msg);
      }
      else { console.log(d.toISOString() + " [log] [" + path.basename(__filename) + "] " + msg); } ;
    }

     /**
     * Log a string to the stderr with the dat/time and JS filename
     * @param {string} msg the error message
     */
        error(msg) {
          var d = new Date(Date.now());
          if (typeof msg != "string") { 
            console.error(d.toISOString() + " [err] [" + path.basename(__filename) + "]");
            console.error(msg);
          }
          else { console.error(d.toISOString() + " [err] [" + path.basename(__filename) + "] " + msg); } ;
        }
  
    /**
    * Refreshes the token every 3 hours
    */
    async refreshToken() {
      try {
        var resp = await this.#getPost.sendPostRequest("https://authentication-prod.strauss-group.com/api/v1/auth/token/refresh",{"refreshToken" : this.#refreshToken},this.#headers);
        this.#headers.Authorization = "Bearer "+resp.accessToken;
      } catch(err) {
        this.error("Error Refreshing Token");
        this.error(err);
      }
    }

    /**
    * Get a list of all the devices available for that specific user
    * @returns {string[]} returns an array containing the JSON representing the device
    */
    async getDevices() {
      try {
        var devices = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com/api/v1/device",this.#headers);
        return devices;
      } catch (err) {
        this.error("Error Getting Devices");
        this.error(err);
      }
    }


    /**
    * Turn on the water-boiling functionality of the device
    * @param {string} deviceId  The ID of the device needs to be used
    * @returns {int} - 0 if all OK, 1 if water are already hot, -1 if general error
    */
    async boilWater(deviceId) {
      try {
        var resp = await this.#getPost.sendPostRequest("https://swelcustomers.strauss-water.com/api/v1/device/" + deviceId + "/startBoiling",null,this.#headers);
        return 0;
      } catch (err) {
        if (err.status == 502) {
          return 1;
        } else {
          this.error("Error Boiling Water");
          this.error(err);
          return -1;
        };
      }
    }

    /**
    * Gets the device configuration
    * @param {string} deviceId  The ID of the device needs to be used
    * @returns {string} returns the configuration of the device
    */
    async getConfiguration(deviceId) {
      try {
        var resp = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com/api/v3/device/" + deviceId + "/configuration",this.#headers);
        return resp.configurationProperties;
      } catch(err) {
        this.error("Error in getting configuration for device-id: " + deviceId);
        this.error(err);
        throw new Error(err);
      }
    }

    /**
    * Sets the device configuration
    * @param {string} deviceId  The ID of the device needs to be used
    * @param {string} configurationProperties  The JSON with the configuration items need to be set
    */
    async setConfiguration(deviceId, configurationProperties) {
      try {
        var body = {
          "id" : deviceId,
          configurationProperties
        }
        var resp = await this.#getPost.sendPostRequest("https://swelcustomers.strauss-water.com/api/v3/device/" + deviceId +"/configuration",body,this.#headers);
      } catch(err) {
        this.error("Error in setting configuration for device-id: " + deviceId);
        this.error(err);
      }
    }

    /**
    * Get information about filter and UV lamp
    * @param {string} deviceId  The ID of the device needs to be used
    * @returns {string} returns the filter and UV lamp information
    */
    async getFilterUVInfo(deviceId) {
      try {
        var resp = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com/api/v3/customer/mainPage/" + deviceId ,this.#headers);
        return resp.dynamicData;
      } catch(err) {
        this.error("Error in getting filter/uv info");
        this.error(err);
      }

    }

    /**
    * Get the user-specific drinks - the drinks that belong to a specific user
    * @returns {string[]} returns the array with the user-specific drinks
    */
    async getUserDrinks(deviceId) {
      try {
        var resp = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com/api/v3/customer/mainPage/" + deviceId ,this.#headers);
        return resp.drinks;
      } catch(err) {
        this.error("Error in getting user drinks");
        this.error(err);
      }
    }

    /**
    * Prepare a specific drink
    * @param {string} deviceId  The ID of the device needs to be used
    * @param {string} drinkId  The ID of the drink needs to be prepared
    * @returns {int} 0 if OK, -1 if error
    */
    async prepareDrink(deviceId, drinkId) {
      try {
        var resp = await this.#getPost.sendPostRequest("https://swelcustomers.strauss-water.com/api/v1/device/" + deviceId + "/prepareDrink/" + drinkId, null,this.#headers);
        return 0; 
      } catch (err) {
        this.error("Could not prepare drink");
        this.error(err);
        return -1;
      }
    }
}

module.exports = Tami4Api;