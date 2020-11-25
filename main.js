const electron = require('electron')
const { app, BrowserWindow, protocol, net } = electron;
const fs = require('fs');
const moment = require('moment');
const express = require('express')
const bodyParser = require('body-parser')
const url = require('url');
const querystring = require('querystring')
var expressApp, bankExpressApp, bankServer, captchaServer;

// Establish Global Varibales for Sitekey and Domain
let globalSitekey;
let globalDomain;


// Start Captcha Bank Array
let captchaBank = [];


// Launch When Ready
app.on('ready', () => {
	initCaptchaWindow();
})


// Open Captcha Window
async function initCaptchaWindow() {
	captchaWindow = new BrowserWindow({
		width: 480,
		height: 680,
			webPreferences: {
				allowRunningInsecureContent: true
			}
	})

	SetupIntercept();

	await captchaWindow.loadFile('loader.html');
	
	captchaWindow.on('close', function(e){
		captchaWindow = null;
	});

	captchaWindow.webContents.session.webRequest.onBeforeRequest({urls: ['https://myaccount.google.com/*']}, (details, callback) => {
		callback({redirectURL: 'http://www.gamenerdz.com/'})
	})
};


// Setup Page Intercept To Replace HTML
function SetupIntercept() {
	protocol.interceptBufferProtocol('http', (req, callback) => {
		if(req.url == `http://www.${globalDomain}/`) {
			fs.readFile(__dirname + '/captcha.html', 'utf8', function(err, html){
				callback({mimeType: 'text/html', data: Buffer.from(html)});
			});
		}else{
			const request = net.request(req)
			request.on('response', res => {
				const chunks = []
	
				res.on('data', chunk => {
					chunks.push(Buffer.from(chunk))
				})
	
				res.on('end', async () => {
					const file = Buffer.concat(chunks)
					callback(file)
				})
			})
	
			if (req.uploadData) {
				req.uploadData.forEach(part => {
					if (part.bytes) {
						request.write(part.bytes)
					} else if (part.file) {
						request.write(readFileSync(part.file))
					}
				})
			}
	
			request.end()
		}
	})
};


// Catch Captcha Request
electron.ipcMain.on('sendCaptcha', async function(event, token) {

	await console.log(token)

	await captchaWindow.loadFile('loader.html');

	await captchaBank.push({
	  token: token,	
	  timestamp: moment(),
	  host: 'http://www.gamenerdz.com/',
	  sitekey: '6LccmasUAAAAAIRhScC9asOrH_rQblw06weNOzDI'
	})
});


// Delete Old Captchas From The Bank
setInterval(function(){
	for (var i = 0; i < captchaBank.length; i++) {

  	if (moment().diff(moment(captchaBank[i].timestamp), 'seconds') > 110) {
		console.log('Removing Expired Captcha Token')
		captchaBank.splice(0,1)
		
	  }
	}
}, 1000);


// Start Locally Hosted Captcha Bank
function initBankServer() {
	bankExpressApp = express()

	let port = '8080';

	console.log('Bank server listening on port: ' + port);
	bankExpressApp.set('port', port);
	bankExpressApp.use(bodyParser.json());
	bankExpressApp.use(bodyParser.urlencoded({ extended: true }));

	bankExpressApp.get('/trigger', function(req, res) {
		initCaptchaWindow();
	});

	bankExpressApp.get('/fetch', function(req, res) {
		return res.json(captchaBank),
		captchaBank.splice(0,1);
	});

	bankServer = bankExpressApp.listen(bankExpressApp.get('port'));

}

initBankServer();


// Handle Task Captcha Requests
function initNeededCaptchaServer() {
	captchaExpressApp = express()

	let port = '8081';

	console.log('Captcha server listening on port: ' + port);
	captchaExpressApp.set('port', port);
	captchaExpressApp.use(bodyParser.json());
	captchaExpressApp.use(bodyParser.urlencoded({ extended: true }));

	captchaExpressApp.get('/CaptchaNeeded', async function(req, res) {


		let parsedUrl = await url.parse(req.url)
		let parsedQs = await querystring.parse(parsedUrl.query)

		await console.log(parsedQs)

		globalDomain = parsedQs.domain

		await captchaWindow.loadURL(`http://www.${parsedQs.domain}/`)

		await sleep(500)

		await captchaWindow.webContents.send('sitekey', parsedQs.sitekey)

		return res.send('Sent')

	});

	captchaServer = captchaExpressApp.listen(captchaExpressApp.get('port'))
}

initNeededCaptchaServer()


// Delay Function
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}