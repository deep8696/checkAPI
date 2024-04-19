//apiCheck for Sobeys

const axios = require('axios');

// APIs to be checked
const apis = [
    {
        name: 'Getting GTIN Product hierarchy',
        url: 'https://sbyccpreis-apim.azure-api.net/product/v1/api/products/0068780954401/654749351000/fullHierarchy',
        method: 'GET',
        apiKey: '2d556ed44244452297b8948b9159f3ee'
    },
    {
        name: 'Getting Article detail',
        url: 'https://sbyccpreis-apim.azure-api.net/SobeysMasterData/1.0.0/api/article/376',
        method: 'GET',
        apiKey: '2d556ed44244452297b8948b9159f3ee'
    },
    {
        name: 'Searching SAP for an article',
        url: 'https://sbyccpreis-apim.azure-api.net/Product/1.0.0/api/article',
        method: 'POST',
        apiKey: '2d556ed44244452297b8948b9159f3ee',
        body: {
            "ArticleNumber": "849064",
            "Description": "",
            "MerchandiseCategory": "",
            "MaxRows": 0
        }
    }
];

// Export the function 
module.exports = async function (context, myTimer) {
    if (myTimer.IsPastDue) {
        context.log('Function is running late!');
    }

    try {
        // Check APIs and get their statuses
        const apiStatus = await checkAPIs();
        context.log('Sending email...');
        // Send email with API statuses
        await sendEmail(apiStatus);
    } catch (error) {
        context.log('Error occurred while checking APIs:', error);
    }
};

// Function to check all APIs defined in the 'apis' array
async function checkAPIs() {
    const results = [];

    // Check APIs 5 times 
    for (let i = 0; i < 5; i++) {
        const apiResults = [];
        // Check each API 
        for (const api of apis) {
            const result = await checkAPI(api);
            apiResults.push(result);
        }
        results.push(apiResults);
    }

    return results;
}

//  HTTP status codes 
const httpStatusExplanations = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
};

// Function to check a single API
async function checkAPI(api) {
    const { url, method, apiKey, name, body } = api;
    const errorMessage = `${name} is not working!`;

    try {
        const config = {
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
            }
        };

        // Set Content-Type header if method is POST
        if (method === 'POST') {
            config.headers['Content-Type'] = 'application/json';
        }

        // Make API request using axios
        const response = await axios.request({
            url,
            method,
            data: body,
            ...config
        });

        // If response status is 200, API is working
        if (response.status === 200) {
            console.log(`${name} is working!`);
            return { message: 'API is working!', status: response.status, explanation: httpStatusExplanations[response.status] };
        } else {
            // If response status is not 200, API is not working
            console.error(`${name} responded with status ${response.status}`);
            return { message: errorMessage, status: response.status, explanation: httpStatusExplanations[response.status] };
        }
    } catch (error) {
        // Handle errors
        console.error(errorMessage, error);
        if (error.response) {
            return { message: errorMessage, status: error.response.status, explanation: httpStatusExplanations[error.response.status] };
        } else {
            return { message: errorMessage, status: null, explanation: null };
        }
    }
}

// Function to send email with API statuses
async function sendEmail(apiStatuses) {
    const mailjetApiKey = '0ed06a02a05337318bc70d8e05e634ee';
    const mailjetApiSecret = 'ba6b805853276001b90b5b5e690c2e09';
    const senderEmail = 'dp6076@gmail.com';
    const recipientEmails = ['pateldeep8696@gmail.com'];

    // Construct email subject with current date
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const subject = `Morning Check ${currentDate}`;

    // Construct email body
    let messageContent = 'Good morning, everyone, <br><br> Sobeys APIs have been checked...<br><br>';

    
    const apiNames = ['Getting GTIN Product hierarchy', 'Getting Article detail', 'Searching SAP for an article'];
    const aggregatedStatuses = new Array(apiNames.length).fill().map(() => ({}));

    apiStatuses.forEach(statuses => {
        statuses.forEach((status, index) => {
            if (status.message === 'API is working!' || !aggregatedStatuses[index][status.status]) {
                if (aggregatedStatuses[index][status.status]) {
                    aggregatedStatuses[index][status.status]++;
                } else {
                    aggregatedStatuses[index][status.status] = 1;
                }
            }
        });
    });

    // Generate message content for each API status
    for (let i = 0; i < apiNames.length; i++) {
        const statusCounts = aggregatedStatuses[i];
        let maxStatusCount = 0;
        let mostFrequentStatus = null;

        Object.entries(statusCounts).forEach(([status, count]) => {
            if (count > maxStatusCount) {
                maxStatusCount = count;
                mostFrequentStatus = status;
            }
        });

        let statusSymbol;
        if (mostFrequentStatus === '200') {
            statusSymbol = '✔️';
        } else {
            statusSymbol = '❌';
        }

        const statusExplanation = mostFrequentStatus ? ` - ${mostFrequentStatus}: ${httpStatusExplanations[mostFrequentStatus]}` : '';

        messageContent += `${statusSymbol} ${apiNames[i]} : <br> <ul><li>${mostFrequentStatus !== null ? 'Status: Working' : 'Status: Not Working'}${statusExplanation}</li></ul>`;
    }

    messageContent += '<br>Thank you!';

    // Mailjet email data
    const emailData = {
        Messages: recipientEmails.map(email => ({
            From: {
                Email: senderEmail,
            },
            To: [
                {
                    Email: email,
                }
            ],
            Subject: subject,
            TextPart: messageContent.replace(/<br>/g, '\n').replace(/✔️/g, '✅').replace(/❌/g, '❌'),
            HTMLPart: `<p>${messageContent}</p>`
        }))
    };

    // Send email using Mailjet API
    try {
        const response = await axios.post('https://api.mailjet.com/v3.1/send', emailData, {
            auth: {
                username: mailjetApiKey,
                password: mailjetApiSecret
            }
        });
        console.log('Email sent:', response.data);
    } catch (error) {
        console.error('Error sending email:', error.response.data);
    }
}
