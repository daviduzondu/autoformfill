// AutoFormFill v1.0.0
import cheerio from "cheerio";
import fsPromises from "fs/promises";
const clientFormId = "1FAIpQLSdfzhdjyt4wshq41itBVPbamBmXbjBeFGHLEXJnl0ndqJ0v0w";
let sendCount = 0;
let probabilities = [];

try {
     probabilities = JSON.parse(await fsPromises.readFile("probabilities.json", { encoding: "utf-8" })).probabilities;
} catch (e) {
     console.error("No probabilities.json file found! ");
     probabilities = [];
}

probabilities = [];

function getRandom(options, weights) {
     if (probabilities.length === 0) {
          return options[Math.floor(Math.random() * options.length)];
     }
     let num = Math.random();
     let s = 0;
     let lastIndex = weights.length - 1;

     for (let i = 0; i < lastIndex; ++i) {
          s += weights[i];
          if (num < s) {
               return options[i];
          }
     }
}

let partialResponse = [[], null, ""];
let pages = 1;

try {
     const response = await fetch(`https://docs.google.com/forms/d/e/${clientFormId}/formResponse`);
     const html = await response.text();
     const $ = cheerio.load(html);
     const questionsCollection = [];
     $('script[type="text/javascript"]').each(async function () {
          const data = JSON.parse($(this).text().split("=")[1].trim().replaceAll(",]", "]").replaceAll(";", ""))[1][1];
          data.filter((x) => {
               const arrayIndex = x.findIndex((y) => Array.isArray(y));
               if (x[arrayIndex][0] == null) pages++;
               return x[arrayIndex][0] !== null;
          }).forEach((qArray) => {
               const qObj = {};
               qArray = qArray.filter((x) => x !== null);
               const choices = qArray.find((x) => typeof x == "object")[0].filter((x) => x !== null);
               qObj.qid = qArray.find((x) => !isNaN(Number(x)));
               qObj.question = qArray.find((x) => typeof x == "string");
               // Make sure there are multiple choice questions
               if (choices.length > 0) {
                    qObj.optionsData = {
                         oid: choices[0],
                         options: choices
                              .find((x) => typeof x == "object")
                              .map((x) => x[0])
                              .filter((x) => x !== ""),
                    };
               } else {
                    throw new Error("Error: Operation failed because form contains non-multiple choice fields.");
               }
               questionsCollection.push(qObj);
          });

          while (true) {
               let formData = new URLSearchParams();
               questionsCollection.forEach((q, i) => {
                    const entry = `entry.${q.optionsData.oid}`;
                    let selectedOption = getRandom(q.optionsData.options, probabilities[i]);
                    formData.append(`entry.${q.optionsData.oid}`, q.optionsData.options[Math.floor(Math.random() * q.optionsData.options.length)]);
                    partialResponse[0].push([null, entry, selectedOption.split(), 0]);
               });
               formData.append("partialResponse", partialResponse);
               let pageHistory = "",
                    i = 0;
               while (i < pages) {
                    pageHistory += String(i++);
               }
               formData.append("pageHistory", pageHistory.split("").join(","));
               console.log(formData);
               partialResponse = [[], null, ""];
               const response = await fetch(`https://docs.google.com/forms/d/e/${clientFormId}/formResponse`, {
                    method: "POST",
                    headers: {
                         "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: formData,
               });
               if (!response.ok) {
                    throw new Error("Network response was not ok");
               }
               console.log(++sendCount);
          }
     });
} catch (e) {
     console.log("Something went wrong!", e);
}
