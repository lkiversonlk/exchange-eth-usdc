const HRE = require('hardhat')

async function deployWithToken(mockTokenAddress) {
    const impFactory = await HRE.ethers.getContractFactory('ExchangeImpl')
    const imp = await impFactory.deploy()
    await imp.waitForDeployment()
    const impAddress = await imp.getAddress()
    console.log('ExchangeImpl deployed to:', impAddress)

    const proxyFactory = await HRE.ethers.getContractFactory('ExchangeProxy')
    const proxy = await proxyFactory.deploy(impAddress, mockTokenAddress)
    await proxy.waitForDeployment()

    const resp = await proxy.deploymentTransaction().wait()

    //find the hash for event AdminChanged(address previousAdmin, address newAdmin);
    const AdminChangeHash = HRE.ethers.id('AdminChanged(address,address)');
    
    //find the event log
    let log;
    for (let i = 0; i < resp.logs.length; i++) {
        if (resp.logs[i].topics[0] === AdminChangeHash) {
            log = resp.logs[i];
            break;
        }
    }

    if (!log) {
        throw new Error('AdminChanged event not found');
    }

    //parse the event log
    //console.log('log:', log);
    //event AdminChanged(address previousAdmin, address newAdmin);
    const proxyAdminAddress = log.args[1]
    console.log(`proxyAdminAddress: ${proxyAdminAddress}`)
    const proxyAddress = await proxy.getAddress()
    console.log('ExchangeProxy deployed to:', proxyAddress)

    const mockPriceFeedFactory = await HRE.ethers.getContractFactory('MockPriceFeed')
    const mockPriceFeed = await mockPriceFeedFactory.deploy()
    await mockPriceFeed.waitForDeployment()
    const mockPriceFeedAddress = await mockPriceFeed.getAddress()
    console.log('MockPriceFeed deployed to:', mockPriceFeedAddress)

    return {
        mockTokenAddress,
        impAddress,
        proxyAddress,
        mockPriceFeedAddress,
        proxyAdminAddress,
    }
}

async function deployMockContracts() {
    const mintAmount = HRE.ethers.parseEther('100000000000')
    const mockTokenFactory = await HRE.ethers.getContractFactory('MockToken')
    const mockToken = await mockTokenFactory.deploy('MockToken', 'MT', mintAmount)
    await mockToken.waitForDeployment()
    const mockTokenAddress = await mockToken.getAddress()

    let ret = await deployWithToken(mockTokenAddress)
    return ret
}

async function deployWithMainnetUSDC() {
    const USDCAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    return deployWithToken(USDCAddr)
}

module.exports = {
    deployMockContracts,
    deployWithMainnetUSDC
}