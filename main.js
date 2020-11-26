const electron = require('electron')
const { app, BrowserWindow, protocol, net } = electron;
const fs = require('fs');
const moment = require('moment');
const express = require('express')
const bodyParser = require('body-parser')
const url = require('url');
const querystring = require('querystring')
const axios = require('axios')

let solverBusy = 'false';

let captchaBank = []

var expressApp, bankExpressApp, bankServer, captchaServer;

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

	// await captchaWindow.loadURL('https://accounts.google.com', {
	// 	userAgent: 'Chrome'
	// })
	
	captchaWindow.on('close', function(e){
		captchaWindow = null;
	});
};


// Setup Page Intercept To Replace HTML
function SetupIntercept() {
	protocol.interceptBufferProtocol('http', (req, callback) => {
		if(req.url.includes('http://')) {
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
electron.ipcMain.on('sendCaptcha', async function(event, token, identifier) {

	await captchaWindow.loadFile('loader.html');

	const captchaConfig = {
        method: 'get',
        url: `http://127.0.0.1:2121/${identifier}?captcha=${token}`,
        headers: { }
	};
	
	await axios(captchaConfig)
	.then(async function (response) {
		console.log(token)
    })
    .catch(function (error) {
        console.log(error);
	});
	
	if (captchaBank.length > 0) {

		await fs.writeFile('captcha.html', `
		<html>
		<head>
			<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
			<title>Captcha Harvester</title>
			<script src="https://www.google.com/recaptcha/api.js" async defer></script>
		</head>
		<body style="background-color: #303030;">

			<form action="/submit" method="POST">
				<div class="g-recaptcha" id="captchaFrame" data-sitekey="${captchaBank[0].sitekey}" data-callback="sub" style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);"></div>
			</form>

			<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>

			<script>

				const remote = require('electron').remote
				const app = remote.app
				const ipcRenderer = require('electron').ipcRenderer

				function sub() {
					ipcRenderer.send('sendCaptcha', grecaptcha.getResponse(), '${captchaBank[0].identifier}');
					grecaptcha.reset();
				}

			</script>
		</body>
		</html>`, function (err) {
			if (err) throw err;
			console.log('HTML Saved')
		})

		await sleep(100)

		await captchaWindow.loadURL(`http://www.${captchaBank[0].domain}/`)

		await captchaBank.splice(0, 1)

	} else {

		solverBusy = await 'false'

	}

});


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

		if (solverBusy === 'false') {

			solverBusy = await 'true'

			await fs.writeFile('captcha.html', `
			<html>
			<head>
				<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
				<title>Captcha Harvester</title>
				<script src="https://www.google.com/recaptcha/api.js" async defer></script>
			</head>
			<body style="background-color: #303030;">
	
				<form action="/submit" method="POST">
					<div class="g-recaptcha" id="captchaFrame" data-sitekey="${parsedQs.sitekey}" data-callback="sub" style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);"></div>
				</form>
	
				<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
	
				<script>
	
					const remote = require('electron').remote
					const app = remote.app
					const ipcRenderer = require('electron').ipcRenderer
	
					function sub() {
						ipcRenderer.send('sendCaptcha', grecaptcha.getResponse(), '${parsedQs.identifier}');
						grecaptcha.reset();
					}
	
				</script>
			</body>
			</html>`, function (err) {
				if (err) throw err;
				console.log('HTML Saved')
			})
	
			await sleep(100)
	
			await captchaWindow.loadURL(`http://www.${parsedQs.domain}/`)
	
			await sleep(500)
	
			return res.send('Sent')

		} else {

			await captchaBank.push({
				sitekey: parsedQs.sitekey,	
				domain: parsedQs.domain,
				identifier: parsedQs.identifier
			})

			await console.log('Added To Queue')

			return res.send('Added To Queue')

		}


	});

	captchaServer = captchaExpressApp.listen(captchaExpressApp.get('port'))
}

initNeededCaptchaServer()


// Delay Function
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}