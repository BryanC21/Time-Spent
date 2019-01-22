/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const dbHelper = require('./helpers/dbHelper');
const main = require('./main.json');
const GENERAL_REPROMPT = "What would you like to do? Add, Remove, List All Tasks or Remove All Tasks";
const dynamoDBTableName = "TimeSpent";

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Hello there. Welcome to Time Spent. Just say HELP for a list of things you can do.';
    const repromptText = 'What would you like to do? You can say HELP to get available options';

    if(supportsDisplay(handlerInput)) {
      var value = "Welcome to Time Spent!\nSay add to add a new task, you can also use add to add time to an existing task just by using the same task name, say remove to erase a task and its time, say get summary to see all your tasks and times, or say remove all tasks to erase all tasks.";

      const bodyTemplate1Data = {
        "bodyTemplate1Data": {
            "type": "object",
            "objectId": "bt1Sample",
            "backgroundImage": {
                "contentDescription": null,
                "smallSourceUrl": null,
                "largeSourceUrl": null,
                "sources": [
                    {
                        "url": "https://s3.amazonaws.com/bryanc21/square.png",
                        "size": "large",
                        "widthPixels": 0,
                        "heightPixels": 0
                    },
                    {
                        "url": "https://s3.amazonaws.com/bryanc21/square.png",
                        "size": "large",
                        "widthPixels": 0,
                        "heightPixels": 0
                    }
                ]
            },
            "title": "Time Spent",
            "textContent": {
                "primaryText": {
                    "type": "PlainText",
                    "text": value
                }
            },
            "logoUrl": "https://s3.amazonaws.com/bryanc21/icon_512_A2Z.png"
        }
      };

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(repromptText)
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.0',
          document: main.document,
          datasources: bodyTemplate1Data
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(repromptText)
        .getResponse();
    }
  },
};

const InProgressAddTaskIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AddTaskIntent' &&
      request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    return handlerInput.responseBuilder
      .addDelegateDirective(currentIntent)
      .getResponse();
  }
}

const AddTaskIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AddTaskIntent';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const task = slots.Task.value;
    var minutes = parseInt(slots.Time.value, 10);

    return dbHelper.getTime(task, userID)
      .then((data) => {
        const speechText = `You have added ${minutes} minutes to ${task}.`;
        if (data.length > 0) {
          minutes += parseInt(data.map(e => e.Time)[0], 10)
        } 
        dbHelper.updateTime(task, minutes, userID)
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        console.log("Error occured while saving task", err);
        const speechText = "we cannot save your task right now. Try again!"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  },
};

const GetTasksIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetTasksIntent';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
    return dbHelper.getSummary(userID)
      .then((data) => {
        var speechText = "Your tasks are: \n"
        if (data.length == 0) {
          speechText = "You do not have any tasks yet, add a task by saying add"
        } else {
          speechText += data.map(e => "- "+e.Task +" with "+ e.Time +" minutes").join("\n")
        }

        if(supportsDisplay(handlerInput)) {
          var value = speechText;

          const bodyTemplate1Data = {
            "bodyTemplate1Data": {
                "type": "object",
                "objectId": "bt1Sample",
                "backgroundImage": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://s3.amazonaws.com/bryanc21/square.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://s3.amazonaws.com/bryanc21/square.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "title": "Summary Of Your Current Tasks And Times",
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": value
                    }
                },
                "logoUrl": "https://s3.amazonaws.com/bryanc21/icon_512_A2Z.png"
            }
          };

          return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .addDirective({
            type: 'Alexa.Presentation.APL.RenderDocument',
            version: '1.0',
            document: main.document,
            datasources: bodyTemplate1Data
          })
          .getResponse();
        } else {
          return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
        }
      })
      .catch((err) => {
        const speechText = "we cannot get your tasks right now. Try again!"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  }
}

const RemoveAllTasksIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RemoveAllTasksIntent';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
    return dbHelper.getSummary(userID)
      .then((data) => {
        var speechText = "All your data has been cleared. Add some new tasks by saying add"
        if (data.length == 0) {
          speechText = "You do not have any tasks yet, add a task by saying add"
        } else {
          data.map(e => dbHelper.removeTask(e.Task, userID))
        }
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        const speechText = "we cannot remove all your tasks right now. Try again!"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  }
}

const InProgressRemoveTaskIntentHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'RemoveTaskIntent' &&
      request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    return handlerInput.responseBuilder
      .addDelegateDirective(currentIntent)
      .getResponse();
  }
}

const RemoveTaskIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RemoveTaskIntent';
  }, 
  handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId; 
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const task = slots.Task.value;
    return dbHelper.removeTask(task, userID)
      .then((data) => {
        const speechText = `You have removed task with name ${task}, you can add another one by saying add`
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        const speechText = `You do not have a task with name ${task}, you can add it by saying add`
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
  }
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'With time spent you can keep track of where your time is being spent. Say add to add a new task, you can also use add to add time to an existing task just by using the same task name, say remove to erase a task and its time, say get summary to see all your tasks and times, or say remove all tasks to erase all tasks.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

function supportsDisplay(handlerInput) {
  return handlerInput.requestEnvelope.context != undefined &&
    handlerInput.requestEnvelope.context.System != undefined &&
    handlerInput.requestEnvelope.context.System.device != undefined &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces != undefined &&
    (handlerInput.requestEnvelope.context.System.device.supportedInterfaces['Alexa.Presentation.APL'] != undefined ||
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display != undefined) &&
    handlerInput.requestEnvelope.context.Viewport != undefined;
}

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    InProgressAddTaskIntentHandler,
    AddTaskIntentHandler,
    GetTasksIntentHandler,
    InProgressRemoveTaskIntentHandler,
    RemoveTaskIntentHandler,
    RemoveAllTasksIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName(dynamoDBTableName)
  .withAutoCreateTable(true)
  .lambda();
