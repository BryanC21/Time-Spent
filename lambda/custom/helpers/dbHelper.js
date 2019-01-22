var AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
const tableName = "TimeSpent";

var dbHelper = function () { };
var docClient = new AWS.DynamoDB.DocumentClient();

dbHelper.prototype.updateTime = (task, minutes, userID) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Key: {
                "userId": userID,
                "Task": task
            },
            UpdateExpression: 'set #a = :x',
            ExpressionAttributeNames: {'#a' : 'Time'},
            ExpressionAttributeValues: {
                ':x' : minutes
            }
        };
        docClient.update(params, (err, data) => {
            if (err) {
                console.log("Unable to insert =>", JSON.stringify(err))
                return reject("Unable to insert");
            }
            console.log("Saved Data, ", JSON.stringify(data));
            resolve(data);
        });
    });
}

dbHelper.prototype.getSummary = (userID) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            KeyConditionExpression: "#userID = :user_id",
            ExpressionAttributeNames: {
                "#userID": "userId"
            },
            ExpressionAttributeValues: {
                ":user_id": userID
            }
        }
        docClient.query(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

dbHelper.prototype.getTime = (task, userID) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            KeyConditionExpression: "#userID = :user_id and #Task = :task",
            ExpressionAttributeNames: {
                "#userID": "userId",
                "#Task": "Task"
            },
            ExpressionAttributeValues: {
                ":user_id": userID,
                ":task": task
            }
        }
        docClient.query(params, (err, data) => {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            } 
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            resolve(data.Items)
            
        })
    });
}

dbHelper.prototype.removeTask = (task, userID) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Key: {
                "userId": userID,
                "Task": task
            },
            ConditionExpression: "attribute_exists(Task)"
        }
        docClient.delete(params, function (err, data) {
            if (err) {
                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                return reject(JSON.stringify(err, null, 2))
            }
            console.log(JSON.stringify(err));
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            resolve()
        })
    });
}

module.exports = new dbHelper();