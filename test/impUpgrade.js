const {
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { expect } = require("chai");
  const { deployMockContracts } = require('./utils');
  const { ethers } = require("hardhat");
  
  describe("Exchange Swap", function () {
    describe("do simple swap and withdraw", function () {
      it("try upgrade", async function () {
        const signers = await ethers.getSigners();
        const { mockTokenAddress, impAddress, proxyAddress, mockPriceFeedAddress, proxyAdminAddress } = await loadFixture(deployMockContracts);
        
        const proxy = await ethers.getContractAt('ExchangeImpl', proxyAddress)
        await proxy.setPriceFeed(mockPriceFeedAddress);

        //give 50 usdc to proxy
        const mToken = await ethers.getContractAt('MockToken', mockTokenAddress);
        await mToken.transfer(proxyAddress, ethers.parseEther('50'));
        await proxy.syncUSDC();

        //signer[1], signers[2] deposit 10 eth and swap 0.3 / 5 eth
        await proxy.connect(signers[1]).depositEthAndSwapForUSDC(ethers.parseEther('0.3'), {value: ethers.parseEther('10')});
        await proxy.connect(signers[2]).depositEthAndSwapForUSDC(ethers.parseEther('5'), {value: ethers.parseEther('10')});

        //deploy a new impl
        const ExchangeImplFactory = await ethers.getContractFactory('ExchangeImpl');
        const newImp = await ExchangeImplFactory.deploy();
        await newImp.waitForDeployment();
        const newImpAddress = await newImp.getAddress();
        console.log('newImpAddress:', newImpAddress);

        //let owner call proxyAdmin.upgradeAndCall()
        const proxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddress);
        await proxyAdmin.upgradeAndCall(proxyAddress, newImpAddress, '0x');

        //get new imp from contract by eth_getStorageAt
        const newImpAddr = await ethers.provider.getStorage(proxyAddress, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc');
        console.log('newImpAddr:', newImpAddr);
        expect(newImpAddr.substring(26).toLowerCase()).to.equal(newImpAddress.substring(2).toLowerCase());

        //the imp replacement succeed, now check data
        //signer[1] should have 9.7 eth, 0.3 eth is swapped to 0.3 usdc
        let ethCount = await proxy.ethCounts(signers[1]);
        console.log('ethCount:', ethCount.toString());
        expect(ethCount).to.equal(ethers.parseEther('9.7'));
        let usdcCount = await mToken.balanceOf(signers[1].address);
        console.log('usdcCount:', usdcCount.toString());
        expect(usdcCount).to.equal(ethers.parseEther('0.3'));

        //signer[2] should have 5 eth, 5 eth is swapped to 5 usdc
        ethCount = await proxy.ethCounts(signers[2]);
        console.log('ethCount:', ethCount.toString());
        expect(ethCount).to.equal(ethers.parseEther('5'));
        usdcCount = await mToken.balanceOf(signers[2].address);
        console.log('usdcCount:', usdcCount.toString());
        expect(usdcCount).to.equal(ethers.parseEther('5'));

        //proxy ethCount should be 14.7
        ethCount = await proxy.ethCount();
        console.log('ethCount:', ethCount.toString());
        expect(ethCount).to.equal(ethers.parseEther('14.7'));

        //balance should be 20 eth
        let balance = await ethers.provider.getBalance(proxyAddress);
        console.log('balance:', balance.toString());
        expect(balance).to.equal(ethers.parseEther('20'));

        //signer[1] could still trade 2 eth for 2 usdc, and he has 2.3 usdc
        await proxy.connect(signers[1]).depositEthAndSwapForUSDC(ethers.parseEther('2'));
        ethCount = await proxy.ethCounts(signers[1]);
        console.log('ethCount:', ethCount.toString());
        expect(ethCount).to.equal(ethers.parseEther('7.7'));
        usdcCount = await mToken.balanceOf(signers[1].address);
        console.log('usdcCount:', usdcCount.toString());
        expect(usdcCount).to.equal(ethers.parseEther('2.3'));

        //now contract ethCount should be 12.7, while balance is still 20 eth
        ethCount = await proxy.ethCount();
        console.log('ethCount:', ethCount.toString());
        expect(ethCount).to.equal(ethers.parseEther('12.7'));
        balance = await ethers.provider.getBalance(proxyAddress);
        console.log('balance:', balance.toString());
        expect(balance).to.equal(ethers.parseEther('20'));

        //let signer[1] call getEth() to withdraw 7.3 eth to signer[0]
        let signerBalance = await ethers.provider.getBalance(signers[0].address);
        console.log('signerBalance:', signerBalance.toString());
        await proxy.connect(signers[1]).getEth();
        let signerBalance2 = await ethers.provider.getBalance(signers[0].address);
        console.log('signerBalance2:', signerBalance2.toString());
        let diff = signerBalance2 - signerBalance;
        console.log('diff:', diff.toString());
        expect(diff).to.equal(ethers.parseEther('7.3'));
      })
    });
  });
  