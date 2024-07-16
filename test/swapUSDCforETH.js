const {
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { expect } = require("chai");
  const { deployMockContracts } = require('./utils');
  const { ethers } = require("hardhat");
  
  describe("Exchange Swap", function () {
    describe("do simple swap and withdraw", function () {
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
        usdcBalance = await mToken.balanceOf(swapper);
        console.log('usdcBalance:', usdcBalance.toString());
        expect(usdcBalance).to.equal(0);

        //deposit 1 eth and swap 0.5 eth
        await proxy.connect(swapper).depositEthAndSwapForUSDC(ethers.parseEther('0.5'), {value: ethers.parseEther('1')});

        //since the price is setup to 1:1, so 0.5eth should get 0.5 usdc
        usdcBalance = await mToken.balanceOf(swapper);
        console.log('usdcBalance:', usdcBalance.toString());
        expect(usdcBalance).to.equal(ethers.parseEther('0.5'));

        //now the contract ethCount should be 0.5 but its balance is 1
        let ethCount = await proxy.ethCount();
        console.log('ethCount:', ethCount.toString());
        expect(ethCount).to.equal(ethers.parseEther('0.5'));
        let ethBalance = await ethers.provider.getBalance(proxyAddress);
        console.log('ethBalance:', ethBalance.toString());
        expect(ethBalance).to.equal(ethers.parseEther('1'));

        //check usdcCount and usdcBalance
        usdcCount = await proxy.usdcCount();
        console.log('usdcCount:', usdcCount.toString());
        usdcBalance = await mToken.balanceOf(proxyAddress);
        console.log('usdcBalance:', usdcBalance.toString());
        expect(usdcCount).to.equal(usdcBalance);

        //swapper may withdraw 0.5 eth, but the balance belong to owner should be 0.5
        await proxy.connect(swapper).withdrawEth(ethers.parseEther('0.5'));
        ethCount = await proxy.ethCount();
        console.log('ethCount:', ethCount.toString());
        expect(ethCount).to.equal(0);
        ethBalance = await ethers.provider.getBalance(proxyAddress);
        console.log('ethBalance:', ethBalance.toString());
        expect(ethBalance).to.equal(ethers.parseEther('0.5'));

        //let the swapper call getEth() to withdraw the remaining eth to owner
        ethBalance = await ethers.provider.getBalance(signers[0].address);
        console.log('ethBalance:', ethBalance.toString());
        await proxy.connect(swapper).getEth();
        let ethBalance2 = await ethers.provider.getBalance(signers[0].address);
        console.log('ethBalance2:', ethBalance2.toString());
        let diff = ethBalance2 - ethBalance;
        console.log('diff:', diff.toString());
        expect(diff).to.equal(ethers.parseEther('0.5'));

        //owner can withdraw the remain usdc by 2 steps
        usdcBalance = await mToken.balanceOf(signers[0].address);
        console.log('usdcBalance:', usdcBalance.toString());
        await proxy.getUSDC(ethers.parseEther('20'));
        let usdcBalance2 = await mToken.balanceOf(signers[0].address);
        console.log('usdcBalance2:', usdcBalance2.toString());
        diff = usdcBalance2 - usdcBalance;
        console.log('diff:', diff.toString());
        expect(diff).to.equal(ethers.parseEther('20'));

        //the record and actual remain should be 20
        usdcCount = await proxy.usdcCount();
        console.log('usdcCount:', usdcCount.toString());
        usdcBalance = await mToken.balanceOf(proxyAddress);
        console.log('usdcBalance:', usdcBalance.toString());
        expect(usdcCount).to.equal(usdcBalance);

        //withdraw the remaining usdc
        await proxy.getUSDC(usdcBalance);
        usdcBalance = await mToken.balanceOf(proxyAddress);
        console.log('usdcBalance:', usdcBalance.toString());
        usdcCount = await proxy.usdcCount();
        console.log('usdcCount:', usdcCount.toString());
        expect(usdcCount).to.equal(0);
        expect(usdcBalance).to.equal(0);
        

        //test if the owner call setSwapEnabled(false) to disable swap
        await proxy.setSwapEnabled(false);
      
        //signer[1] depositSwap should fail

        let failed = false;
        try {
          await proxy.connect(swapper).depositEthAndSwapForUSDC(ethers.parseEther('0.5'), {value: ethers.parseEther('1')});
        } catch (e) {
          failed = true;
        }
        expect(failed).to.equal(true);
      })
    });
  });
  