'use strict';

const GetPost = require("./GetPost");
var path = require('path');

class Tami4Api {
  #token;
  #headers;
  #getPost;
  
  constructor(token) {
    this.#token = token;
    this.#headers = {
        "Host" : "swelcustomers.strauss-water.com",
        "Accept" : "application/json, text/plain, */*",
        "Connection" : "keep-alive",
        "Accept-Language" : "en-us",
        "User-Agent" : "tami4edge/81 CFNetwork/1333.0.4 Darwin/21.5.0",
        "Content-Type" : "application/json"
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
    * Refreshes the token every 3 hours
    */
    async refreshToken() {
      try {
        var resp = await this.#getPost.sendPostRequest("https://swelcustomers.strauss-water.com//public/token/refresh",{"token" : this.#token},this.#headers);
        this.#headers.Authorization = resp.token_type+resp.access_token;
      } catch(err) {
        this.log("Error Refreshing Token");
        this.log(err);
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
        this.log("Error Getting Devices");
        this.log(err);
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
          this.log("Error Boiling Water");
          this.log(err);
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
        var resp = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com/api/v1/device/" + deviceId +"/configuration",this.#headers);
        return resp.configurationProperties;
      } catch(err) {
        this.log("Error in getting configuration for device-id: " + deviceId);
        this.log(err);
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
        var resp = await this.#getPost.sendPostRequest("https://swelcustomers.strauss-water.com/api/v1/device/" + deviceId +"/configuration",body,this.#headers);
      } catch(err) {
        this.log("Error in setting configuration for device-id: " + deviceId);
        this.log(err);
      }
    }

    /**
    * Get information about filter and UV lamp
    * @param {string} deviceId  The ID of the device needs to be used
    * @returns {string} returns the filter and UV lamp information
    */
    async getFilterUVInfo() {
      try {
        var resp = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com/api/v2/customer/waterQuality",this.#headers);
        return resp;
      } catch(err) {
        this.log("Error in getting filter/uv info");
        this.log(err);
      }

    }

    /**
    * Get the name of the current customer (user)
    * @returns {string} returns the name of the current customer (user)
    */
    async getCurrentUserName() {
      try {
        var resp = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com//api/v1/customer",this.#headers);
        return resp.displayName;
      } catch(err) {
        this.log("Error in getting cueernt user name");
        this.log(err);
      } 
    }

    /**
    * Get the generic drinks - the drinks that do not belong to a specific user
    * @param {string} deviceId  The ID of the device needs to be used
    * @returns {string[]} returns the array with generic drinks
    */
    async getGenericDrinks(deviceId) {
      try {
        var resp = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com/api/v1/device/" + deviceId + "/drink",this.#headers);
        return resp.drinks;
      } catch(err) {
        this.log("Error in getting generic drinks");
        this.log(err);
      } 
    }

    /**
    * Get the user-specific drinks - the drinks that belong to a specific user
    * @returns {string[]} returns the array with the user-specific drinks
    */
    async getUserDrinks() {
      try {
        var resp = await this.#getPost.sendGetRequest("https://swelcustomers.strauss-water.com/api/v1/customer/drink",this.#headers);
        return resp.drinks;
      } catch(err) {
        this.log("Error in getting user drinks");
        this.log(err);
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
        this.log("Could not prepare drink");
        this.log(err);
        return -1;
      }
    }
}

module.exports = Tami4Api;