let queue = []

async function test() {

    await queue.push({
        token: '123',	
        host: 'http://www.gamenerdz.com/',
        sitekey: '6LccmasUAAAAAIRhScC9asOrH_rQblw06weNOzDI'
    })

    await queue.push({
        token: '456',	
        host: 'http://www.gamenerdz.com/',
        sitekey: '6LccmasUAAAAAIRhScC9asOrH_rQblw06weNOzDI'
    })

    for (i = 0; i < queue.length; i++) {

        

    }

    await console.log(queue.length)
}

test()