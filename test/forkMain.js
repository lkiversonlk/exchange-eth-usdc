const {
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { expect } = require("chai");
  const { deployWithMainnetUSDC } = require('./utils');
  const { ethers } = require("hardhat");
  const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

  const USDCAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  const CHAINLINK_USDC_ETH = "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4"
  const USDC_BIG_HOLDER = "0xD6153F5af5679a75cC85D8974463545181f48772"

  describe("Exchange Swap", function () {
    describe("do simple swap and withdraw", function () {
      it("depoly on main", async function () {
        const signers = await ethers.getSigners();
        
        //reset to your own eth mainnet rpc
        await helpers.reset("https://eth.llamarpc.com")
        console.log(`deploying`)
        const { mockTokenAddress, impAddress, proxyAddress, mockPriceFeedAddress } = await loadFixture(deployWithMainnetUSDC);

        console.log(`get usdc`)
        const USDC = await ethers.getContractAt('MockToken', USDCAddr)
        let usdcBalance = await USDC.balanceOf(USDC_BIG_HOLDER)

        console.log('usdcBalance:', usdcBalance.toString());
        //impersonate USDC_BIG_HOLDER and transfer 90000 usdc to proxyAddress
        await hre.network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [USDC_BIG_HOLDER]
        })
        const USDC_BIG_HOLDER_SIGNER = await ethers.getSigner(USDC_BIG_HOLDER)

        //send some eth to USDC_BIG_HOLDER
        await signers[0].sendTransaction({to: USDC_BIG_HOLDER, value: ethers.parseEther('1')});

        await USDC.connect(USDC_BIG_HOLDER_SIGNER).transfer(proxyAddress, ethers.parseUnits('90000', 6));

        const proxy = await ethers.getContractAt('ExchangeImpl', proxyAddress)
        await proxy.syncUSDC();

        let usdcCount = await proxy.usdcCount();
        console.log('usdcCount:', usdcCount.toString());

        //connect exchange to price feed;
        await proxy.setPriceFeed(CHAINLINK_USDC_ETH);

        const priceFeed = await ethers.getContractAt('MockPriceFeed', CHAINLINK_USDC_ETH);

        

        //let signer[1] deposit 1 eth and swap 0.5 eth
        let swapper = signers[1];
        usdcBalance = await USDC.balanceOf(swapper.address);
        console.log(`swapper`, swapper.address)
        console.log('usdcBalance:', usdcBalance.toString());
        await proxy.connect(swapper).depositEthAndSwapForUSDC(ethers.parseEther('0.5'), {value: ethers.parseEther('1')});
        const lastRoundData = await priceFeed.latestRoundData();
        const price = lastRoundData[1];
        console.log('price:', price.toString());
        //check the balance of swapper
        let usdcBalance2 = await USDC.balanceOf(swapper.address);
        console.log('usdcBalance2:', usdcBalance2.toString());
        let diff = usdcBalance2 - usdcBalance;
        console.log('diff:', diff.toString());
        console.log(`use 0.5 eth to swap ${Number(diff)/1e6} usdc`);

        const exchangePrice = 0.5 * 1e18 * 1e6 / Number(diff);
        const ratio = Number(price) / exchangePrice;
        console.log('ratio:', ratio, 'price:', price, 'exchangePrice:', exchangePrice);
        //assume the ratio between 0.99999999 and 1.00000001
        expect(ratio).to.be.within(0.99999999, 1.00000001);
      })
    });
  });
  