var builder = require('botbuilder');
var uuidConstants = require('./uuid-constants');
var uuidv5 = require('uuid/v5');
var apiai = require('apiai');
var express = require('express');
var axios = require('axios');
var https = require('https');
var fs = require('fs');
var Promise = require('bluebird');
var request = require('request-promise').defaults({encoding: null});
var app = express();
var api = apiai("3e67227584004ff781cea81f0514ad22"); // Sutirtha's Agent
var path = require("path");
var sessionID = uuidv5('', uuidConstants.MY_NAMESPACE);
var inputContexts = [];
var checkEmailContexts = ['greetings-followup', 'greeting', 'email'];
var checkIncidentContexts = ['email', 'priority-identifier', 'sub-area', 'incident'];
var checkIntentCMTContexts = ['email', 'intent-cmt', 'incident'];
var checkShortDescriptionContexts = ['email', 'incident', 'sub-area-identifier-followup'];
var shortDescription = '';
var urgency = '';
var impact = '';
var issueType = '';
var priority = '';
var userID = '';
var userSysID = '';
var captureCMTInput = false;
var category = 'software';
var subCategory = 'sap';
var openedBy = '878aa0c5db430300cb4259d0cf9619ba'; // Mitr
var contactType = 'ChatBot'; // Chat Bot
//var assignmentGroup = 'c0bb20c5db430300cb4259d0cf9619e8'; // WM
var assignmentGroup = '';
var assignedTo = 'sutroy';
var firstName = '';
var detailedDescription = '';
var incidentNumber = '';
var incidentSysId = '';
var temporaryIncidentCreationTracker = false;
var firstFlowFinalDialogue = false;
var directory = 'temp';
var assignmentGroupUpdatedOnce = false;
var openIncidentsSysIDMapForUser = {};
var openIncidentsEscalationMapForUser = {};
var currentQueriedIncidentNumber = '';
var escalationFollowup = false;
var incidentNumberQueryFollowup = false;
var dummyTicketStatusContext = {
    'name': "ticketstatus",
    'parameters': {},
    'lifespan': 5
};
//
//=========================================================
// Bot Setup
//=========================================================

app.listen(3005, function () {
    console.log('listening on  port 3005');
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: "1a3c2099-c862-43af-9efd-040ae0e41e85", // Sutirtha's
    appPassword: "sbgmoOH3105)%euCAEXJ8$+"
});
var bot = new builder.UniversalBot(connector, {
    storage: new builder.MemoryBotStorage()
});

app.post('/api/messages', connector.listen());

//Bot on
bot.on('contactRelationUpdate', function (message) {
    console.log('Someone trying to find me !!');
    if (message.action === 'add') {
        console.log('Some one added me !!');
        var name = message.user ? message.user.name : null;
        var reply = new builder.Message()
                .address(message.address)
                .text("Hello %s... Thanks for adding me. Say 'hello' to see some great demos.", name || 'there');
        bot.send(reply);
    } else {
        // delete their data
    }
});

bot.on('typing', function (message) {
    // User is typing
});

bot.on('deleteUserData', function (message) {
    // User asked to delete their data
});

//=========================================================
// Bots Dialogs
//=========================================================

String.prototype.contains = function (content) {
    return this.indexOf(content) !== -1;
};

//var download = function(url, dest, cb) {
//  var file = fs.createWriteStream(dest);
//  var request = https.get(url, function(response) {
//    response.pipe(file);
//    file.on('finish', function() {
//      file.close(cb);  // close() is async, call cb after close completes.
//    });
//  }).on('error', function(err) { // Handle errors
//    fs.unlink(dest); // Delete the file async. (But we don't check the result)
//    if (cb) cb(err.message);
//  });
//};

var sleep = function (seconds, callback) {
    var waitTill = new Date(new Date().getTime() + seconds * 1000);
    while (waitTill > new Date()) {
    }
    if (callback !== undefined)
        return callback();
};

var saveFile = function (binaryContent, destination, callback) {
    fs.writeFile(destination, binaryContent, "binary", function (err) {
        if (err) {
            return callback(err);
        } else {
            return callback('File Saved Successfully');
        }
    });
};

// Promise for obtaining JWT Token (requested once)
var obtainToken = Promise.promisify(connector.getAccessToken.bind(connector));

// Request file with Authentication Header
var requestWithToken = function (url) {
    console.log('Inside requestWithToken and the url is ' + url);
    return obtainToken().then(function (token) {
        return request({
            url: url,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/octet-stream'
            }
        });
    });
};

var checkRequiresToken = function (message) {
    console.log('Returning ' + message.source === 'skype' || message.source === 'msteams' + ' from checkRequiresToken');
    return message.source === 'skype' || message.source === 'msteams';
};

var download = function (message, attachment, callback) {
    console.log('In the Download function');
    var fileDownload = checkRequiresToken(message) ? requestWithToken(attachment.contentUrl) : request(attachment.contentUrl);
    fileDownload.then(
            function (response) {
                console.log('Received Response : ' + response);
                return callback(response);
                // Send reply with attachment type & size
//                var reply = new builder.Message(session)
//                    .text('Attachment of %s type and size of %s bytes received.', attachment.contentType, response.length);
//                session.send(reply);

                // convert image to base64 string
//                var imageBase64Sting = new Buffer(response, 'binary').toString('base64');
                // echo back uploaded image as base64 string
//                var echoImage = new builder.Message(session).text('You sent:').addAttachment({
//                    contentType: attachment.contentType,
//                    contentUrl: 'data:' + attachment.contentType + ';base64,' + imageBase64Sting,
//                    name: 'Uploaded image'
//                });
//                session.send(echoImage);
            }).catch(function (err) {
        console.log('Error downloading attachment:', {statusCode: err.statusCode, message: err.response.statusMessage});
    });
};

var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

bot.dialog('/', function (session) {
    var data = session.message;
    if (data.attachments && data.attachments.length > 0) {
        var userAttachments = data.attachments;
        directory = userID === '' ? directory : userID;
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
        for (var ind = 0; ind < userAttachments.length; ind++) {
            var userAttachment = userAttachments[ind];
            console.log('contentType : ' + userAttachment.contentType);
            console.log('contentUrl : ' + userAttachment.contentUrl);
            console.log('name : ' + userAttachment.name);
            console.log('content : ' + userAttachment.content);
            console.log('ThumbnailUrl : ' + userAttachment.thumbnailUrl);
//            download(userAttachment.contentUrl, directory + '/' + userAttachment.name, function(responseMessage){
//                console.log('Final response ' + responseMessage);
//            });
            download(data, userAttachment, function (responseMessage) {
                console.log('Final Download response size ' + responseMessage.length);
                saveFile(responseMessage, directory + '/' + userAttachment.name, function (fileSaveResponse) {
                    if (fileSaveResponse === 'File Saved Successfully') {
                        console.log('Go Ahead with upload in SNOW');
                        uploadToServiceNow(directory + '/' + userAttachment.name, 'incident', incidentSysId, userAttachment.contentType, userAttachment.name, function (responseMessage) {
                            console.log('Got This From SNOW ' + responseMessage);
//                fs.unlinkSync(directory + '/' + userAttachment.name);
                        });
                    } else {
                        console.log('------- File Upload Failed in SNOW ------');
                    }
                });
            });

        }
        return;
//        fs.rmdirSync(directory);
//        session.send('Check console !!');
    }
    var message = session.message.text;
    console.log(message);
    filterHTML(message, function (actualText) {
        message = actualText;
    });
//    if(message.toLowerCase().contains('subcon') || message.toLowerCase().contains('sub con')){    
//        shortDescription = message;
//        message = 'Subcon';
//    }
    if (captureCMTInput) {
        updateShortDescriptionForCMT(message, function (processedInput) {
            shortDescription = shortDescription + '\n' + processedInput;
        });
    }
    var request = api.textRequest(message, {
        sessionId: sessionID,
        contexts: inputContexts
    });
    request.on('response', function (response) {
        inputContexts = response.result.contexts;
        var index = 0;
        for (index = 0; index < inputContexts.length; index++) {
            var context = inputContexts[index];
            console.log(context.name);
        }
        var speech = response.result.fulfillment.speech;
        console.log('Received from Dialogflow : ' + speech);
        var checkEmailAllPresent = true;
        var emailCheckIndex = 0;
        for (emailCheckIndex = 0; emailCheckIndex < inputContexts.length; emailCheckIndex++) {
            var context = inputContexts[emailCheckIndex];
            if (checkEmailContexts.indexOf(context.name) === -1) {
                checkEmailAllPresent = false;
                break;
            }
        }
        if (checkEmailAllPresent && inputContexts.length === 3) {
            speech = 'Check Email';
        }
        var checkIncidentAllPresent = true;
        var incidentCheckIndex = 0;
        for (incidentCheckIndex = 0; incidentCheckIndex < inputContexts.length; incidentCheckIndex++) {
            var context = inputContexts[incidentCheckIndex];
            if (checkIncidentContexts.indexOf(context.name) === -1) {
                checkIncidentAllPresent = false;
                break;
            }
        }
        /*if(checkIncidentAllPresent && inputContexts.length === 4){
         //            detailedDescription = message; // Better don't do this here
         //            speech = 'Create Incident'; // Don't do this, intents are not the same every time
         }*/

        var checkCMTIncidentAllPresent = true;
        var cmtIncidentCheckIndex = 0;
        for (cmtIncidentCheckIndex = 0; cmtIncidentCheckIndex < inputContexts.length; cmtIncidentCheckIndex++) {
            var context = inputContexts[cmtIncidentCheckIndex];
            if (captureCMTInput) {
                if (context.name === 'intent-cmt')
                    speech = 'Create Incident';
            }
            if (checkIntentCMTContexts.indexOf(context.name) === -1) {
                checkCMTIncidentAllPresent = false;
                break;
            }
        }

        if (checkCMTIncidentAllPresent && inputContexts.length === 3) {
            if (shortDescription === '') {
                shortDescription = message;
            }
            captureCMTInput = true;
        }

        var checkShortDescrptionContextsAllPresent = true;
        var shortDescriptionContextCheckIndex = 0;
        for (shortDescriptionContextCheckIndex = 0; shortDescriptionContextCheckIndex < inputContexts.length; shortDescriptionContextCheckIndex++) {
            var context = inputContexts[shortDescriptionContextCheckIndex];
            if (checkShortDescriptionContexts.indexOf(context.name) === -1) {
                checkShortDescrptionContextsAllPresent = false;
                break;
            }
        }

        if (checkShortDescrptionContextsAllPresent && inputContexts.length === 3) {
            shortDescription = message;
        }
//        console.log('***********************/nLogging for No flow\nincidentNumber' + incidentNumber + '\nassignmentGroup ' + assignmentGroup + '\nspeech is ' + speech + '\nResult of Actual if ' + ((speech === 'Create Incident' || speech.contains('while we create an incident')) && (incidentNumber === '' || incidentNumber === null)));
        if (speech === 'Check Email') {
            fetchUserNameFromServiceNow(response, function (userName) {
                if (userName === 'User Not Available' || userName === '') {
                    speech = 'Sorry, I couldn\'t find you. You are not authorized to proceed further';
                    session.send(speech);
                    resetVariables();
                } else {
                    firstName = userName;
                    speech = 'Hello ' + firstName + ', Do you need assistance for creating a new ticket or know the status of an existing ticket?';
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
                }
            });
            /*//        } else if(speech.startsWith('Please verify') || speech.startsWith('Please check')){
             //        } else if(speech.contains('ticket pertains') || speech.contains('choose a sub-area') || outputHasNoSubAreaContext(inputContexts)){
             //            var contextsIndex = 0;
             //            for(contextsIndex = 0; contextsIndex < inputContexts.length; contextsIndex++){
             //                var contextObject = inputContexts[contextsIndex];
             //                if(contextObject.name === 'incident'){
             //                    var incidentParametersObject = contextObject.parameters;
             //                    Object.keys(incidentParametersObject).forEach(function(key){
             //                        if(key === 'incident-sub-area'){
             //                            assignmentGroup = incidentParametersObject[key]; // This is the assignment group
             //                            console.log('assignment group identified ' + assignmentGroup);
             //                        } else if (key === 'incident'){
             //                            issueType = incidentParametersObject[key];
             //                        }
             //                    });
             //                    break;
             //                }
             //            }
             //            if(speech.endsWith('WMM')){
             //                speech = speech.replace('WMM','WM');
             //            }
             //            console.log('Sent to UI : ' + speech);
             //            session.send(speech);*/
        } else if (speech.startsWith('Request you to') || speech.contains('priority of this incident')) {
            /*//            speech = 'May I know the priority of this incident? Should it be High, Normal or Low?';
             //            speech = 'What should be the priority of this incident. High or Medium or Low?';*/
            console.log('Sent to UI : ' + speech);
            session.send(speech);
        } else if ((speech === 'Create Incident' || speech.contains('while we create an incident')) && incidentNumber === '') {
//            priority = message;
            detailedDescription = message;
            if (captureCMTInput) {
                priority = 'normal';
                category = 'inquiry';
                subCategory = '	internal application';
//                if(assignmentGroup === '')
//                    assignmentGroup = 'b4fb28c1db430300cb4259d0cf961926'; // Security
            }
            if (priority.toLowerCase().contains('high')) {
                urgency = '1';
                impact = '1';
            } else if (priority.toLowerCase().contains('normal')) {
                urgency = '2';
                impact = '2';
            } else if (priority.toLowerCase().contains('low')) {
                urgency = '3';
                impact = '3';
            } else {
                urgency = '2';
                impact = '2';
            }
            createIncidentInServiceNow(function (incidentNumberCB) {
                if (incidentNumberCB !== '') {
//                   speech = 'Thank you! Your incident has been created in Service Now.Incident Number is *' + incidentNumber + '*.\r\nPlease upload any documents in Service Now for this incident number if required for the support team to investigate your incident.';
                    speech = 'Thank you ' + firstName + ', in case you’d like to upload any additional document for the support team for reference please use the attachment icon with this chat window and let me know when you are done.';
                    temporaryIncidentCreationTracker = true;
                } else {
                    speech = 'I am sorry, I can not create incident in Service Now at this point. Please try after some time.';
                    resetVariables();
                }
                console.log('Sent to UI :' + speech);
                session.send(speech);
            });
        } else if (speech.contains('ticket pertains') || speech.contains('choose a sub-area') || outputHasNoSubAreaContext(inputContexts) && !assignmentGroupUpdatedOnce) {
            var contextsIndex = 0;
            for (contextsIndex = 0; contextsIndex < inputContexts.length; contextsIndex++) {
                var contextObject = inputContexts[contextsIndex];
                if (contextObject.name === 'incident') {
                    var incidentParametersObject = contextObject.parameters;
                    Object.keys(incidentParametersObject).forEach(function (key) {
                        if (key === 'incident-sub-area') {
                            if (assignmentGroup !== incidentParametersObject[key] && assignmentGroup !== '') {
                                assignmentGroupUpdatedOnce = true;
                            }
                            assignmentGroup = incidentParametersObject[key]; // This is the assignment group
                        } else if (key === 'incident') {
                            issueType = incidentParametersObject[key];
                        }
                    });
                    break;
                }
            }
            if (speech.endsWith('WMM')) {
                speech = speech.replace('WMM', 'WM');
            }
            console.log('Sent to UI : ' + speech);
            session.send(speech);
//        } else if (message.contains('I need an update for my ticket.') && speech.contains('No Problem, I can assist you through this process.')) { // This has to be executed when the intents are sent for ticket querying
        } else if (speech.contains('I see that you have created') && checkIfContextPresent(inputContexts, 'ticketstatus')) { // This has to be executed when the intents are sent for ticket querying
            speech = 'Sure, I can assist you with that ' + firstName + '.';
            console.log('Sent to UI : ' + speech);
            session.send(speech);
            fetchUserCreatedTicketsFromServiceNow(userSysID, function (commaSeparatedIncidentNumbers) {
                if (commaSeparatedIncidentNumbers === 'error') {
                    speech = 'I am sorry, I could not retrieve data at this point of time. Please try later.';
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
                    resetVariables();
                } else if (commaSeparatedIncidentNumbers === '') {
                    speech = 'There are no open incidents created by you at this point of time.';
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
                } else {
                    speech = 'I find you’ve created the below tickets that are open.';
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
                    sleep(2);
                    speech = commaSeparatedIncidentNumbers;
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
                    sleep(2);
                    speech = 'Please let me know one at a time for which you need information.';
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
                }
            });
//            speech = 'Sure, I can assist you with that ' + firstName + '. I find you’ve created the below tickets that are open. (List from the SNOW the tickets based on the email of the user). Please let me know one at a time for which you need information.';
//            console.log('Sent to UI : ' + speech);
//            session.send(speech);
        } else if (message.startsWith('INC')) { // This has to be executed when the intents and the paramaeters match for a specific incident
            if (!checkIfContextPresent(inputContexts, 'ticketstatus')) {
                inputContexts.push(dummyTicketStatusContext); // Send to dialog flow this ticketstatus context if not already present when user is entering ticket number
            }
            var queriedIncidentNumber = message;
            currentQueriedIncidentNumber = queriedIncidentNumber;
            var queriedIncidentSysID = openIncidentsSysIDMapForUser[queriedIncidentNumber];
//            console.log('Queried for incident number ' + queriedIncidentNumber);
//            console.log('Sys ID of the incident number ' + queriedIncidentNumber + ' is ' + queriedIncidentSysID);
            if (queriedIncidentSysID === undefined || queriedIncidentSysID === null || queriedIncidentSysID === '') {
                console.log('This incident is not created by you');
                speech = 'This ticket is not created by you. Please choose a ticket from the above list of tickets created by you.';
                console.log('Sent to UI : ' + speech);
                session.send(speech);
            } else {
                fetchIncidentInformationFromServiceNow(queriedIncidentNumber, function (assignedTo, status, comment) {
                    if (assignedTo === '' && status === '' && comment === '') {
                        if (!checkIfContextPresent(inputContexts, 'ticketstatus')) {
                            inputContexts.push(dummyTicketStatusContext);
                        }
                        speech = 'The ticket you queried for doesn\'t exist. Please enter a valid ticket number.';
                        console.log('Sent to UI : ' + speech);
                        session.send(speech);
                    } else if (assignedTo === status === comment === 'error') {
                        speech = 'I\'m sorry, I could not retrieve any information at this point of time. Please try later.';
                        console.log('Sent to UI : ' + speech);
                        session.send(speech);
                        resetVariables();
                    } else {
                        speech = 'Incident ' + queriedIncidentNumber + ' is ';
                        if (assignedTo === '') {
                            speech = speech + 'not assigned yet, status of the incident is ';
                        } else {
                            speech = speech + 'assigned to ' + assignedTo + ', status of the incident is ';
                        }
                        if (status === '') {
                            speech = speech + ' New and ';
                        } else {
                            speech = speech + status + ' and ';
                        }
                        if (comment === '') {
                            speech = speech + 'there are no comments on this incident yet';
                        } else {
                            speech = speech + 'the last comment is ' + comment;
                        }
                        if (!checkIfContextPresent(inputContexts, 'ticketstatus')) {
                            inputContexts.push(dummyTicketStatusContext);
                        }
                        console.log('Sent to UI : ' + speech);
                        session.send(speech);
                        sleep(2, function () {
                            escalationFollowup = true;
                            speech = 'Would you like me to escalate this ticket?';
                            console.log('Sent to UI : ' + speech);
                            session.send(speech);
                        });
                    }
                });
            }
//        } else if (incidentNumberQueryFollowup) {
//            if (message.toLocaleLowerCase().contains('no')) {
//                incidentNumberQueryFollowup = false;
//                speech = firstName + ', thank you for contacting our IT Help Desk, have a great day!';
//                console.log('Sent to UI : ' + speech);
//                session.send(speech);
//                resetVariables();
//            }
        } else if (escalationFollowup && currentQueriedIncidentNumber !== '') {
            escalationFollowup = false;
            if (message.toLocaleLowerCase().contains('no')) {
//                incidentNumberQueryFollowup = true;
//                speech = 'Do you want to enquire for more tickets? If yes, please enter incident number';
//                console.log('Sent to UI : ' + speech);
//                session.send(speech);
                speech = firstName + ', thank you for contacting our IT Help Desk, have a great day!';
                console.log('Sent to UI : ' + speech);
                session.send(speech);
                resetVariables();
            } else {
//                incidentNumberQueryFollowup = false;
                var existingEscalation = openIncidentsEscalationMapForUser[currentQueriedIncidentNumber];
                if (existingEscalation === undefined || existingEscalation === null) {
                    console.log('You are not authorized to escalate a ticket that is not created by you.');
                    speech = 'You are not authorized to escalate a ticket(' + currentQueriedIncidentNumber + ') that is not created by you. Please try later.';
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
                    resetVariables();
                } else if (existingEscalation === '4') {
                    speech = 'This incident is already escalated at the highest level. Your ticket' + currentQueriedIncidentNumber + ' will be resolved at the earliest.';
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
//                    sleep(2, function () {
//                        incidentNumberQueryFollowup = true;
//                        speech = 'Do you want to enquire for more tickets? If yes, please enter incident number';
//                        console.log('Sent to UI : ' + speech);
//                        session.send(speech);
//                    });
                    sleep(2, function () {
                        speech = firstName + ', thank you for contacting our IT Help Desk, have a great day!';
                        console.log('Sent to UI : ' + speech);
                        session.send(speech);
                        resetVariables();
                    });
                } else {
                    var currentQueriedIncidentSysID = openIncidentsSysIDMapForUser[currentQueriedIncidentNumber];
                    var newEscalationValue = (existingEscalation === '' ? 1 : parseInt(existingEscalation, 10) + 1);
                    escalateIncidentInServiceNow(currentQueriedIncidentSysID, newEscalationValue, function (response) {
                        if (response === 'success') {
                            speech = 'No problem ' + firstName + ', I have escalated this ticket.';
                            console.log('Sent to UI : ' + speech);
                            session.send(speech);
                            sleep(2, function () {
                                speech = firstName + ', thank you for contacting our IT Help Desk, have a great day!';
                                console.log('Sent to UI : ' + speech);
                                session.send(speech);
                                resetVariables();
                            });
                        } else if (response === 'error' || response === 'issue') {
                            speech = 'I\'m sorry, I\'m facing some issue at this point of time. Please try later.';
                            console.log('Sent to UI : ' + speech);
                            session.send(speech);
                            resetVariables();
                        }
                    });
                }

            }
        } else if (speech.contains('I can assist you through this')) {
            if (speech.toLocaleLowerCase().startsWith('no problem,')) {
                speech = speech.replace('No Problem,', 'No problem ' + firstName + ',');
            } else {
                speech = 'No problem ' + firstName + ',' + ' ' + speech;
            }
            console.log('Sent to UI : ' + speech);
            session.send(speech);
        } else if (speech.contains('detailed description')) {
            priority = message; // Need to identify this like assignment group from parameter object
//            console.log('****** priority captured as ' + priority);
            console.log('Sent to UI : ' + speech);
            session.send(speech);
        } else {
            if (temporaryIncidentCreationTracker) {
                speech = 'Thank you. ' + firstName + ', I have created ' + incidentNumber + ', you should receive an email confirmation about the same.';
                temporaryIncidentCreationTracker = false;
                firstFlowFinalDialogue = true;
            }
            console.log('Sent to UI : ' + speech);
            session.send(speech);
            if (firstFlowFinalDialogue) {
                speech = 'Thank you for contacting our IT Help Desk, have a great day!';
                var waitTill = new Date(new Date().getTime() + 3000);
                while (waitTill > new Date()) {
                }
                console.log('Sent to UI : ' + speech);
                session.send(speech);
                firstFlowFinalDialogue = false;
                resetVariables();
            }
        }
    });

    request.on('error', function (error) {
        session.send(error);
    });
    request.end();
});

function escalateIncidentInServiceNow(incidentSysID, newEscalationValue, callback) {
    var response = '';
    axios.patch('https://dev24231.service-now.com/api/now/v2/table/incident/' + incidentSysID,
            {
                'escalation': newEscalationValue
            },
            {headers: {"Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": ("Basic " + new Buffer("admin:serviceNow@1").toString('base64'))}}
    ).then((data) => {
        var incidentObject = data.data.result;
        if (parseInt(incidentObject.escalation, 10) === newEscalationValue) {
            response = 'success';
            return callback(response);
        } else {
            response = 'issue';
            return callback(response);
        }
    }).catch((e) => {
        console.log("error", e.toString());
        return callback('error');
    });
}

function fetchIncidentInformationFromServiceNow(incidentNumber, callback) {
    var assignedTo = '';
    var status = '';
    var comment = '';
    axios.get(encodeURI('https://dev24231.service-now.com/api/now/v2/table/incident?sysparm_query=') + encodeURIComponent('number=' + incidentNumber) + '&sysparm_display_value=true&' + encodeURI('sysparm_fields=') + encodeURIComponent('assigned_to,incident_state,comments_and_work_notes'),
            {headers: {"Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": ("Basic " + new Buffer("admin:serviceNow@1").toString('base64'))}}
    ).then((data) => {
        var resultArray = data.data.result;
        if (resultArray.length === 0) {
            return callback(assignedTo, status, comment);
        }
        var incidentInformationObject = resultArray[0];
        assignedTo = incidentInformationObject.assigned_to.display_value;
        status = incidentInformationObject.incident_state;
        var comments = incidentInformationObject.comments_and_work_notes;
        if (comments !== '') {
            comment = comments.split("\n\n")[0];
        }
        return callback(assignedTo, status, comment);
    }).catch((e) => {
        console.log("error", e.toString());
        return callback('error', 'error', 'error');
    });
}

function fetchUserCreatedTicketsFromServiceNow(userSysID, callback) {
    var commaSeparatedIncidentNumbers = '';
//    console.log('Encoded URI is ' + encodeURI('https://dev24231.service-now.com/api/now/v2/table/incident?sysparm_query=') + encodeURIComponent('caller_id=' + userSysID + '^state<6^active=true^ORDERBYDESCnumber') + '&' + encodeURI('sysparm_fields=') + encodeURIComponent('number,sys_id'));
    axios.get(encodeURI('https://dev24231.service-now.com/api/now/v2/table/incident?sysparm_query=') + encodeURIComponent('caller_id=' + userSysID + '^state<6^active=true^ORDERBYDESCnumber') + '&' + encodeURI('sysparm_fields=') + encodeURIComponent('number,sys_id,escalation'),
            {headers: {"Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": ("Basic " + new Buffer("admin:serviceNow@1").toString('base64'))}}
    ).then((data) => {
        var resultArray = data.data.result;
        if (resultArray.length > 0) {
            var numberOfOpenIncidentsByCaller = resultArray.length;
            var incidentsIndex = 0;
            var counter = 0;
            for (incidentsIndex = 0; incidentsIndex < numberOfOpenIncidentsByCaller; incidentsIndex++) {
                var openIncidentObject = resultArray[incidentsIndex];
                openIncidentsSysIDMapForUser[openIncidentObject.number] = openIncidentObject.sys_id;
                openIncidentsEscalationMapForUser[openIncidentObject.number] = openIncidentObject.escalation;
                if (counter < 3) {
                    commaSeparatedIncidentNumbers = commaSeparatedIncidentNumbers + openIncidentObject.number + ',';
                    counter++;
                } else {
                    commaSeparatedIncidentNumbers = commaSeparatedIncidentNumbers + openIncidentObject.number + '\n';
                    counter = 0;
                }
            }
            commaSeparatedIncidentNumbers = commaSeparatedIncidentNumbers.substring(0, commaSeparatedIncidentNumbers.length - 1);
            return callback(commaSeparatedIncidentNumbers);
        } else {
            return callback(commaSeparatedIncidentNumbers);
        }
    }).catch((e) => {
        console.log("error", e.toString());
        return callback('error');
    });
}

function fetchUserNameFromServiceNow(response, callback) {
    var userName = '';
    var firstName = '';
    var lastName = '';
    var contexts = response.result.contexts;
    var numberOfContexts = contexts.length;
    var email = '';
    var index = 0;
    for (index = 0; index < numberOfContexts; index++) {
        var contextObject = contexts[index];
        if (contextObject.name === 'email') {
            var emailParametersObject = contextObject.parameters;
            Object.keys(emailParametersObject).forEach(function (key) {
                if (key === 'email-config') {
                    email = emailParametersObject[key];
                }
            });
            break;
        }
    }

    axios.get(encodeURI('https://dev24231.service-now.com/api/now/v2/table/sys_user?sysparm_query=email=' + email + '&sysparm_limit=1'),
            {headers: {"Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": ("Basic " + new Buffer("admin:serviceNow@1").toString('base64'))}}
    ).then((data) => {
        var resultArray = data.data.result;
        if (resultArray.length === 1) {
            var userObject = resultArray[0];
            userID = userObject.user_name;
            userSysID = userObject.sys_id;//2a6727a6db320300cb4259d0cf9619fc
            firstName = userObject.first_name;
            lastName = userObject.last_name;
            userName = firstName + " " + lastName;
            return callback(firstName);
        } else {
            userName = 'User Not Available';
            return callback(userName);
        }
    }).catch((e) => {
        console.log("error", e.toString());
        return callback(firstName);
    });
}

function createIncidentInServiceNow(callback) {
    var incidentNumberString = '';
    var incidentSysIdString = '';
    axios.post('https://dev24231.service-now.com/api/now/table/incident',
            {'short_description': shortDescription,
                'assignment_group': assignmentGroup,
                'urgency': urgency,
                'impact': impact,
                'caller_id': userID,
                'category': category,
                'subcategory': subCategory,
                'opened_by': openedBy,
                'contact_type': contactType,
                'assigned_to': assignedTo,
                'description': detailedDescription
            },
            {headers: {"Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": ("Basic " + new Buffer("admin:serviceNow@1").toString('base64'))}}
    ).then((response) => {
        incidentNumberString = response.data.result.number.toString();
        incidentNumber = incidentNumberString;
        incidentSysIdString = response.data.result.sys_id.toString();
        incidentSysId = incidentSysIdString;
        return callback(incidentNumberString);
    }).catch((e) => {
        console.log(e);
        return callback(incidentNumberString);
    });
}

function uploadToServiceNow(fileName, table, recordSysId, contentType, actualFileName, callback) {
    var binaryFileContent = null;
    console.log('Reading file : ' + fileName);
    fs.readFile(fileName, function (err, data) {
        binaryFileContent = data;
        console.log(binaryFileContent);
        console.log('Length of binary content ' + binaryFileContent.length);
        uploadNow(binaryFileContent, actualFileName, table, recordSysId, contentType, callback);
    });

}

function uploadNow(binaryFileContent, fileName, table, recordSysId, contentType, callback) {
    var params = '?table_name=' + table + '&table_sys_id=' + recordSysId + '&file_name=' + fileName;
    axios.post('https://dev24231.service-now.com/api/now/attachment/file' + params,
            binaryFileContent,
            {headers: {"Accept": "application/json",
                    "Content-Type": contentType,
                    "Authorization": ("Basic " + new Buffer("admin:serviceNow@1").toString('base64'))}}

    ).then((response) => {
//        console.log(response);
        return callback(response);
//        incidentNumber = response.data.result.number.toString();
//        return callback(incidentNumber);
    }).catch((e) => {
        console.log(e);
//        return callback(incidentNumber);
    });
}

function filterHTML(message, callback) {
    var actualText = message;
    if (message.startsWith('<a ') && message.endsWith('a>')) {
        message = message.substring(message.indexOf('>') + 1);
        actualText = message.substring(0, message.indexOf('<'));
    }
    return callback(actualText);
}

function updateShortDescriptionForCMT(message, callback) {
    var cmtInputsArray = [];
    var processedInput = '';
    var cmtParameters = ['Project Name : ', 'Service Line : ', 'Client Name : '];
    if (message !== '' && message.contains(',')) {
        cmtInputsArray = message.split(",");
    }
    var index = 0;
    if (cmtInputsArray.length > 1) {
        for (index = 0; index < cmtInputsArray.length; index++) {
            if (index !== cmtInputsArray.length - 1)
                processedInput += cmtParameters[index] + cmtInputsArray[index].trim() + '\n';
            else
                processedInput += cmtParameters[index] + cmtInputsArray[index].trim();
        }
    }
    return callback(processedInput);
}

function resetVariables() {
    deleteFolderRecursive(directory);
    inputContexts = [];
    sessionID = uuidv5(Math.random() + '', uuidConstants.MY_NAMESPACE);
    captureCMTInput = false;
    assignmentGroup = '';
//  assignmentGroup = 'c0bb20c5db430300cb4259d0cf9619e8'; // WM
    subCategory = 'sap';
    firstName = '';
    detailedDescription = '';
    incidentNumber = '';
    incidentSysId = '';
    shortDescription = '';
    urgency = '';
    impact = '';
    userID = '';
    priority = '';
    issueType = '';
    category = 'software';
    temporaryIncidentCreationTracker = false;
    firstFlowFinalDialogue = false;
    directory = 'temp';
    assignmentGroupUpdatedOnce = false;
    userSysID = '';
    openIncidentsSysIDMapForUser = {};
    openIncidentsEscalationMapForUser = {};
    currentQueriedIncidentNumber = '';
    escalationFollowup = false;
    incidentNumberQueryFollowup = false;
}

var outputHasNoSubAreaContext = function (outputContexts) {
    var index = 0;
    for (index = 0; index < outputContexts.length; index++) {
        var context = outputContexts[index];
        if (context.name === 'sub-area-identifier-followup-no')
            return true;
    }
    return false;
};

var checkIfContextPresent = function (outputContexts, contextToCheck) {
    var index = 0;
    for (index = 0; index < outputContexts.length; index++) {
        var context = outputContexts[index];
        if (context.name === contextToCheck)
            return true;
    }
    return false;
};



