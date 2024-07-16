const {
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { expect } = require("chai");
  const { deployMockContracts } = require('./utils');
  const { ethers } = require("hardhat");
  
  describe("Exchange Swap", function () {
    describe("do simple swap", function () {
      it("deposit and swap", async function () {
        const signers = await ethers.getSigners();
        const { mockTokenAddress, impAddress, proxyAddress, mockPriceFeedAddress } = await loadFixture(deployMockContracts);
        const proxy = await ethers.getContractAt('ExchangeImpl', proxyAddress)

        //connect proxy to price feed;
        await proxy.setPriceFeed(mockPriceFeedAddress);

        const priceFeed = await ethers.getContractAt('MockPriceFeed', mockPriceFeedAddress);

        const lastRoundData = await priceFeed.latestRoundData();
        console.log('lastRoundData:', lastRoundData.toString());

        const mToken = await ethers.getContractAt('MockToken', mockTokenAddress);
        const mTokenBalance = await mToken.balanceOf(signers[0].address);
        console.log('mTokenBalance:', mTokenBalance.toString());

        //transfer 50 mToken to proxy, and call syncUSDC()
        await mToken.transfer(proxyAddress, ethers.parseEther('50'));
        let usdcBalance = await mToken.balanceOf(proxyAddress);
        console.log('usdcBalance:', usdcBalance.toString());

        const owner = await proxy.owner();
        console.log('owner:', owner);
        console.log('signers[0]:', signers[0].address);
        await proxy.syncUSDC();

        let usdcCount = await proxy.usdcCount();
        console.log('usdcCount:', usdcCount.toString());
        expect(usdcCount).to.equal(ethers.parseEther('50'));

        let usdcDecimals = await proxy.usdcDecimals();
        console.log('usdcDecimals:', usdcDecimals.toString());
        expect(usdcDecimals).to.equal(18);
        
        //swap 
        let swapper = signers[1];

        //deposit 1 eth and swap 0.5 eth
        await proxy.connect(swapper).depositEthAndSwapForUSDC(ethers.parseEther('0.5'), {value: ethers.parseEther('1')});
      })
    });
  });
  