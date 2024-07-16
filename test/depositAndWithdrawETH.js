const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { deployMockContracts } = require('./utils');
const { ethers } = require("hardhat");

describe("Exchange", function () {
  describe("Deployment", function () {
    it("just de deploy", async function () {
      const { mockTokenAddress, impAddress, proxyAddress} = await loadFixture(deployMockContracts);
      console.log('mockTokenAddress:', mockTokenAddress)
      console.log('impAddress:', impAddress)
      console.log('proxyAddress:', proxyAddress)
    });

    it("deposit and no swap, then withdraw by 2 step", async function () {
      const signers = await ethers.getSigners();
      const { mockTokenAddress, impAddress, proxyAddress} = await loadFixture(deployMockContracts);
      const proxy = await ethers.getContractAt('ExchangeImpl', proxyAddress)

      await proxy.depositEthAndSwapForUSDC(0, {value: ethers.parseEther('1')});
      const balance = await proxy.ethCounts(signers[0]);
      console.log('deposit balance:', balance.toString())
      expect(balance).to.equal(ethers.parseEther('1'));

      //withdraw 0.5 eth
      let signerBalance = await ethers.provider.getBalance(signers[0].address);
      console.log('singerBalance:', signerBalance.toString());
      await proxy.withdrawEth(ethers.parseEther('0.5'));
      const balance2 = await proxy.ethCounts(signers[0]);
      console.log('deposit balance2:', balance2.toString());
      expect(balance2).to.equal(ethers.parseEther('0.5'));

      let signerBalance2 = await ethers.provider.getBalance(signers[0].address);
      console.log('singerBalance:', signerBalance2.toString());
      let diff = signerBalance2 - signerBalance;
      console.log('diff:', diff.toString());
      expect(diff).to.greaterThan(ethers.parseEther('0.49')); //0.5 - the gas cost
      signerBalance = signerBalance2;

      //withdraw 0.5 eth
      await proxy.withdrawEth(ethers.parseEther('0.5'));
      const balance3 = await proxy.ethCounts(signers[0]);
      console.log('balance3:', balance3.toString())
      expect(balance3).to.equal(ethers.parseEther('0'));
      let signerBalance3 = await ethers.provider.getBalance(signers[0].address);
      console.log('singerBalance:', signerBalance3.toString());
      diff = signerBalance3 - signerBalance;
      console.log('diff:', diff.toString());
      expect(diff).to.greaterThan(ethers.parseEther('0.49')); //0.5 - the gas cost
    })

    it("owner withdraw eth", async function () {
      const signers = await ethers.getSigners();
      const { mockTokenAddress, impAddress, proxyAddress} = await loadFixture(deployMockContracts);

      //signer[1] send 0.3 eth to proxyAddress
      await signers[1].sendTransaction({to: proxyAddress, value: ethers.parseEther('0.3')});

      //signer[2] depsoit 0.5 eth to proxyAddress
      const proxy = (await ethers.getContractAt('ExchangeImpl', proxyAddress)).connect(signers[2]);
      await proxy.depositEthAndSwapForUSDC(0, {value: ethers.parseEther('0.5')});

      //check balance of contract
      const balance = await ethers.provider.getBalance(proxyAddress);
      console.log('balance:', balance.toString());
      expect(balance).to.equal(ethers.parseEther('0.8'));

      //signer[1] call getEth to withdraw 0.3 eth to signer[0]
      const proxy2 = (await ethers.getContractAt('ExchangeImpl', proxyAddress)).connect(signers[1]);
      const balanceOfSigner0Before = await ethers.provider.getBalance(signers[0].address);
      await proxy2.getEth();
      const balanceOfSigner0After = await ethers.provider.getBalance(signers[0].address);
      
      //check balance of contract
      const balance2 = await ethers.provider.getBalance(proxyAddress);
      console.log('balance2:', balance2.toString());
      expect(balance2).to.equal(ethers.parseEther('0.5'));

      //check balance of signer[0]
      console.log('balanceOfSigner0Before:', balanceOfSigner0Before.toString());
      console.log('balanceOfSigner0After:', balanceOfSigner0After.toString());
      const diff = balanceOfSigner0After - balanceOfSigner0Before;
      console.log('diff:', diff.toString());
      expect(diff).to.equal(ethers.parseEther('0.3'));

      //check signer[2] deposit balance
      const signer2DepositBalance = await proxy.ethCounts(signers[2]);
      console.log('signer2DepositBalance:', signer2DepositBalance.toString());
      expect(signer2DepositBalance).to.equal(ethers.parseEther('0.5'));
    });
  });
});
