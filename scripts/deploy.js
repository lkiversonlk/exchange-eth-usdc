const HRE = require('hardhat')
async function main() {
    const impFactory = await HRE.ethers.getContractFactory('ExchangeImpl')

    const imp = await impFactory.deploy()

    await imp.waitForDeployment()

    const impAddress = await imp.getAddress()
    console.log('ExchangeImpl deployed to:', impAddress)

    const proxyFactory = await HRE.ethers.getContractFactory('ExchangeProxy')

    const proxy = await proxyFactory.deploy(impAddress)

    await proxy.waitForDeployment()

    const proxyAddress = await proxy.getAddress()
    console.log('ExchangeProxy deployed to:', proxyAddress)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })