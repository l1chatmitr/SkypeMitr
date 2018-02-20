var builder = require('botbuilder');
var uuidConstants = require('./uuid-constants');
var uuidv5 = require('uuid/v5');
var apiai = require('apiai');
var express = require('express');
var axios = require('axios');
var app = express();
var api = apiai("3e67227584004ff781cea81f0514ad22"); // Sutirtha's Agent
var path = require("path");
var sessionID = uuidv5('',uuidConstants.MY_NAMESPACE);
var inputContexts = [];
var checkEmailContexts = ['greetings-followup','greeting','email'];
var checkIncidentContexts = ['email','priority-identifier','sub-area'];
var checkIntentCMTContexts = ['email', 'intent-cmt', 'incident'];
var checkShortDescriptionContexts = ['email','incident','sub-area-identifier-followup'];
var shortDescription = '';
//var area = '';
var urgency = '';
var impact = '';
var issueType = '';
var priority = '';
var userID = '';
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
//
//=========================================================
// Bot Setup
//=========================================================

app.listen(3004, function(){
    console.log('listening on  port 3004');
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: "1a3c2099-c862-43af-9efd-040ae0e41e85", // Sutirtha's
    appPassword: "sbgmoOH3105)%euCAEXJ8$+"
});
var bot = new builder.UniversalBot(connector,{
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

String.prototype.contains = function(content){
  return this.indexOf(content) !== -1;
};

bot.dialog('/', function (session) {
    var message = session.message.text;
    console.log(message);
    filterHTML(message, function(actualText){
        message = actualText;
    });
    if(message.toLowerCase().contains('subcon') || message.toLowerCase().contains('sub con')){    
//        shortDescription = message;
        message = 'Subcon';
    }
    if(captureCMTInput){
        updateShortDescriptionForCMT(message, function(processedInput){
           shortDescription = shortDescription + '\n' + processedInput; 
        });
    }
    var request = api.textRequest(message, {
        sessionId: sessionID,
        contexts : inputContexts
    });
    request.on('response', function(response){
        inputContexts = response.result.contexts;
        var index = 0;
        for(index = 0; index < inputContexts.length; index++){
            var context = inputContexts[index];
            console.log(context.name);
        }
        var speech = response.result.fulfillment.speech;
        console.log('Received from Dialogflow : ' + speech);
        var checkEmailAllPresent = true;
        var emailCheckIndex = 0;
        for(emailCheckIndex = 0; emailCheckIndex < inputContexts.length; emailCheckIndex++){
            var context = inputContexts[emailCheckIndex];
            if(checkEmailContexts.indexOf(context.name) === -1){
                checkEmailAllPresent = false;
                break;
            }
        }
        if(checkEmailAllPresent && inputContexts.length === 3){
            speech = 'Check Email';
        }
        var checkIncidentAllPresent = true;
        var incidentCheckIndex = 0;
        for(incidentCheckIndex = 0; incidentCheckIndex < inputContexts.length; incidentCheckIndex++){
            var context = inputContexts[incidentCheckIndex];
            if(checkIncidentContexts.indexOf(context.name) === -1){
                checkIncidentAllPresent = false;
                break;
            }
        }
        if(checkIncidentAllPresent && inputContexts.length === 3){
            detailedDescription = message;
            speech = 'Create Incident';
        }
        
        var checkCMTIncidentAllPresent = true;
        var cmtIncidentCheckIndex = 0;
        for(cmtIncidentCheckIndex = 0; cmtIncidentCheckIndex < inputContexts.length; cmtIncidentCheckIndex++){
            var context = inputContexts[cmtIncidentCheckIndex];
            if(captureCMTInput){
                if(context.name === 'intent-cmt')
                    speech = 'Create Incident';
            }
            if(checkIntentCMTContexts.indexOf(context.name) === -1){
                checkCMTIncidentAllPresent = false;
                break;
            }
        }
        
        if(checkCMTIncidentAllPresent && inputContexts.length === 3){
            if(shortDescription === ''){
                shortDescription = message;
            }
            captureCMTInput = true;
        }
        
        var checkShortDescrptionContextsAllPresent = true;
        var shortDescriptionContextCheckIndex = 0;
        for(shortDescriptionContextCheckIndex = 0; shortDescriptionContextCheckIndex < inputContexts.length; shortDescriptionContextCheckIndex++){
            var context = inputContexts[shortDescriptionContextCheckIndex];
            if(checkShortDescriptionContexts.indexOf(context.name) === -1){
                checkShortDescrptionContextsAllPresent = false;
                break;
            }
        }
        
        if(checkShortDescrptionContextsAllPresent && inputContexts.length === 3){
            shortDescription = message;
        }
        if(speech === 'Check Email'){
            fetchUserNameFromServiceNow(response, function(userName){
                if(userName === 'User Not Available' || userName === ''){
                    speech = 'Sorry, I couldn\'t find you. You are not authorized to proceed further';
                    session.send(speech);
                    sessionID = uuidv5(Math.random()+'',uuidConstants.MY_NAMESPACE);
                    inputContexts = [];
                    sessionID = uuidv5(Math.random()+'',uuidConstants.MY_NAMESPACE);
                    captureCMTInput = false;
                    assignmentGroup = '';
//                    assignmentGroup = 'c0bb20c5db430300cb4259d0cf9619e8'; // WM
                    subCategory = 'sap';
                    firstName = '';
                    detailedDescription = '';
                } else {
                    firstName = userName;
                    speech = 'Hello ' + firstName + ', Do you need assistance for creating a new ticket or know the status of an existing ticket?';
                    console.log('Sent to UI : ' + speech);
                    session.send(speech);
                }
            });
//        } else if(speech.startsWith('Please verify') || speech.startsWith('Please check')){
        } else if(speech.contains('ticket pertains')){
            var contextsIndex = 0;
            for(contextsIndex = 0; contextsIndex < inputContexts.length; contextsIndex++){
                var contextObject = inputContexts[contextsIndex];
                if(contextObject.name === 'incident'){
                    var incidentParametersObject = contextObject.parameters;
                    Object.keys(incidentParametersObject).forEach(function(key){
                        if(key === 'incident-sub-area'){
                            assignmentGroup = incidentParametersObject[key]; // This is the assignment group
                            console.log('assignment group identified ' + assignmentGroup);
                        } else if (key === 'incident'){
                            issueType = incidentParametersObject[key];
                        }
                    });
                    break;
                }
            }
            if(speech.endsWith('WMM')){
                speech = speech.replace('WMM','WM');
            }
            console.log('Sent to UI : ' + speech);
            session.send(speech);
        } else if(speech.startsWith('Request you to') || speech.contains('priority of this incident')){
//            speech = 'May I know the priority of this incident? Should it be High, Normal or Low?';
//            speech = 'What should be the priority of this incident. High or Medium or Low?';
            console.log('Sent to UI : ' + speech);
            session.send(speech);
        }else if(speech === 'Create Incident'){
//            priority = message;
            if(captureCMTInput){
                priority = 'medium';
                category = 'inquiry';
                subCategory = '	internal application';
//                if(assignmentGroup === '')
//                    assignmentGroup = 'b4fb28c1db430300cb4259d0cf961926'; // Security
            }
            if(priority.toLowerCase().contains('high')){
                urgency = '1';
                impact = '1';
            } else if(priority.toLowerCase().contains('medium')){
                urgency = '2';
                impact = '2';
            } else if(priority.toLowerCase().contains('low')){
                urgency = '3';
                impact = '3';
            } else {
                urgency = '2';
                impact = '2';
            }
            createIncidentInServiceNow(function(incidentNumber){
               if(incidentNumber !== ''){
                   speech = 'Thank you! Your incident has been created in Service Now.Incident Number is *' + incidentNumber + '*.\r\nPlease upload any documents in Service Now for this incident number if required for the support team to investigate your incident.';
                   inputContexts = [];
                   sessionID = uuidv5(Math.random()+'',uuidConstants.MY_NAMESPACE);
                   captureCMTInput = false;
                   assignmentGroup = '';
//                   assignmentGroup = 'c0bb20c5db430300cb4259d0cf9619e8'; // WM
                   subCategory = 'sap';
                   firstName = '';
                   detailedDescription = '';
               } else {
                   speech = 'I am sorry, I can not create incident in Service Now at this point. Please try after some time.';
                   inputContexts = [];
                   sessionID = uuidv5(Math.random()+'',uuidConstants.MY_NAMESPACE);
                   captureCMTInput = false;
                   assignmentGroup = '';
//                   assignmentGroup = 'c0bb20c5db430300cb4259d0cf9619e8'; // WM
                   subCategory = 'sap';
                   firstName = '';
                   detailedDescription = '';
               }
               console.log('Sent to UI :' + speech);
               session.send(speech);
            });
        } else if (speech.contains('I can assist you through this')){
            if(speech.toLocaleLowerCase().startsWith('no problem,')){
                speech = speech.replace('No Problem,', 'No problem ' + firstName + ',');
            } else {
                speech = 'No problem ' + firstName + ',' + ' ' + speech;
            }
            console.log('Sent to UI : ' + speech);
            session.send(speech);
        } else if(speech.contains('detailed description')){
            priority = message; // Need to identify this like assignment group
            console.log('Sent to UI : ' + speech);
            session.send(speech);
        } else {
            console.log('Sent to UI : ' + speech);
            session.send(speech);
        }
    });
    
    request.on('error', function(error) {
        session.send(error);
    });
    request.end();
});

function fetchUserNameFromServiceNow(response, callback){
    var userName = '';
    var firstName = '';
    var lastName = '';
    var contexts = response.result.contexts;
    var numberOfContexts = contexts.length;
    var email = '';
    var index = 0;
    for(index = 0; index < numberOfContexts; index++){
        var contextObject = contexts[index];
        if(contextObject.name === 'email'){
            var emailParametersObject = contextObject.parameters;
            Object.keys(emailParametersObject).forEach(function(key){
                if(key === 'email-config'){
                    email = emailParametersObject[key];
                }
            });
            break;
        }
    }

    axios.get(encodeURI('https://dev24231.service-now.com/api/now/v2/table/sys_user?sysparm_query=email='+email+'&sysparm_limit=1'),
              {headers:{"Accept":"application/json",
                        "Content-Type":"application/json",
                        "Authorization": ("Basic " + new Buffer("admin:serviceNow@1").toString('base64'))}}
             ).then((data)=>{
                 var resultArray = data.data.result;
                 if(resultArray.length === 1){
                     var userObject = resultArray[0];
                     userID = userObject.user_name;
                     firstName = userObject.first_name;
                     lastName = userObject.last_name;
                     userName = firstName + " " + lastName;
                     return callback(firstName);
                 } else {
                     userName = 'User Not Available';
                     return callback(userName);
                 }
             }).catch((e)=>{
                 console.log("error",e.toString());
                 return callback(firstName);
             });
}

function createIncidentInServiceNow(callback){
    var incidentNumber = '';
    axios.post('https://dev24231.service-now.com/api/now/table/incident',
               {'short_description' : shortDescription,
                 'assignment_group' : assignmentGroup,
                 'urgency' : urgency,
                 'impact' : impact,
                 'caller_id' : userID,
                 'category' : category,
                 'subcategory' : subCategory,
                 'opened_by' : openedBy,
                 'contact_type' : contactType,
                 'assigned_to' : assignedTo,
                 'description' : detailedDescription
               },
               {headers:{"Accept":"application/json",
                        "Content-Type":"application/json",
                        "Authorization": ("Basic " + new Buffer("admin:serviceNow@1").toString('base64'))}}
    ).then((response)=>{
        incidentNumber = response.data.result.number.toString();
        return callback(incidentNumber);
    }).catch((e)=>{
        console.log(e);
        return callback(incidentNumber);
    });
}

function filterHTML(message, callback){
    var actualText = message;
    if(message.startsWith('<a ') && message.endsWith('a>')){
        message = message.substring(message.indexOf('>') + 1);
        actualText = message.substring(0, message.indexOf('<'));
    }
    return callback(actualText);
}

function updateShortDescriptionForCMT(message, callback){
    var cmtInputsArray = [];
    var processedInput = '';
    var cmtParameters = ['Project Name : ', 'Service Line : ', 'Client Name : '];
    if(message !== '' && message.contains(',')){
        cmtInputsArray = message.split(",");
    }
    var index = 0;
    if(cmtInputsArray.length > 1){
        for(index = 0; index < cmtInputsArray.length; index++){
            if(index !== cmtInputsArray.length-1)
                processedInput += cmtParameters[index] + cmtInputsArray[index].trim() + '\n';
            else
                processedInput += cmtParameters[index] + cmtInputsArray[index].trim();
        }
    }
    return callback(processedInput);
}



