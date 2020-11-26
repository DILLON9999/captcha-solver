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

    await console.log(queue)

    await console.log('\n')

    await queue.splice(0, 1)

    await console.log(queue)
}

test()