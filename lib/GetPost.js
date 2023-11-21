'use strict';

var request = require('request');

class GetPost {

  /**
  * Send a POST-HTTP request
  * @param {string} url the URL to send the request to
  * @param {string} body the body (date) of the rquest. Can be null if not body/data is required
  * @param {string} headers a JSON string of the headers to be used. Can be null if no headers are required (not recommended)
  * @returns {Promise<string>} returns the response of the POST request
  */
    async sendPostRequest(url, body, headers) {
        var requestBody = {
          url: url,
          method: "POST",
          json: true,
        };
        if (body) {
          requestBody.body = body;
        }
        if (headers) {
            requestBody.headers = headers;
        }

        console.log("---------------------");
        console.log("Sending POST Request:");
        console.log(requestBody);
    
        return new Promise((resolve, reject) => {
            request(requestBody, (err,response,body) => {
              if (!err && response.statusCode === 200) {
                console.log("POST Response: " + JSON.stringify(body));
                console.log("---------------------");
                resolve(body);
              } else if (err) {
                console.log("Post Error: ");
                console.log(err);
                console.log("---------------------");
                reject(err);
              } else {
                console.log("Post Error Status Code: " + response.statusCode);
                console.log("---------------------");
                reject(body);
              }
            })
        })
      }

  /**
  * Send a GET-HTTP request
  * @param {string} url the URL to send the request to
  * @param {string} headers a JSON string of the headers to be used. Can be null if no headers are required (not recommended)
  * @returns {Promise<string>} returns the response of the GET request
  */
    async sendGetRequest(url,headers) {
        var requestBody = {
            url: url,
            method: "GET",
            json: true,
            };
        if (headers) {
            requestBody.headers = headers;
        }

        console.log("--------------------");
        console.log("Sending GET Request:");
        console.log(requestBody);

        return new Promise((resolve, reject) => {
            request(requestBody, (err, response, body) => {
                if (!err && response.statusCode === 200) {
                    console.log("GET Response: " + JSON.stringify(body));
                    console.log("--------------------");
                    resolve(body);
                } else if (err) {
                  console.log("Get Error: ");
                  console.log(err);
                  console.log("---------------------");  
                  reject(err);
                } else {
                  console.log("Get Error Status Code: " + response.statusCode);
                  console.log("---------------------");  
                  reject(body);
                }
            });
        });
    }

};

module.exports = GetPost;
